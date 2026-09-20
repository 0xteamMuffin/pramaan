"""Document extraction: OCR provider -> normalized fields, cached by file_hash.

With an empty .env the OCR provider is FixtureOCR, which echoes the fields the
seed already placed on Document.extracted. Live OCR (Gemini vision) upgrades this
transparently. Results are written back to Document.extracted and cached so
re-runs are instant and deterministic (docs/03-architecture/ai-verification-engine.md §1).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.compliance import rules
from app.providers.registry import get_ocr

# Module-level cache: file_hash -> normalized fields (survives within a process)
_CACHE: dict[str, dict[str, Any]] = {}

# Extracted-dict keys we normalize to uppercase (IDs)
_ID_FIELDS = ("pan", "gstin", "udyam", "udyam_no", "cin", "din", "dpiit", "bis", "esic", "epfo")


def _read_bytes(document: Any) -> bytes:
    """Best-effort read of the underlying file; safe (b"") when absent."""
    uri = getattr(document, "storage_uri", None)
    if not uri:
        return b""
    try:
        path = Path(uri)
        if path.exists() and path.is_file():
            return path.read_bytes()
    except (OSError, ValueError):
        pass
    return b""


def _normalize_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Uppercase known IDs in-place-ish; return a new dict (preserves markers)."""
    out = dict(fields or {})
    for k in list(out.keys()):
        if k.lower() in _ID_FIELDS and isinstance(out[k], str):
            out[k] = out[k].strip().upper()
    return out


def extract_document(db: Session, document: Any) -> dict[str, Any]:
    """Run OCR (or use cache), normalize fields, persist to Document.extracted.

    Returns the normalized fields dict.
    """
    existing = dict(getattr(document, "extracted", None) or {})
    file_hash = getattr(document, "file_hash", None)

    # Cache hit by file_hash (already extracted in this process or prior run)
    if file_hash:
        if existing.get("_extraction_hash") == file_hash:
            return existing
        if file_hash in _CACHE:
            merged = {**existing, **_CACHE[file_hash]}
            document.extracted = merged
            db.add(document)
            return merged

    hints = {
        "fields": existing,
        "extracted": existing,
        "text": existing.get("_text", ""),
        "confidence": existing.get("confidence", 0.95),
    }

    ocr = get_ocr()
    try:
        result = ocr.extract(_read_bytes(document), hints=hints)
        ocr_fields = dict(result.fields or {})
        provider = result.provider
        confidence = float(result.confidence)
        mode = result.mode
        text = result.text or existing.get("_text", "")
    except Exception as exc:  # noqa: BLE001 - never break the run on extraction
        ocr_fields = {}
        provider = "unavailable"
        confidence = 0.0
        mode = "SIMULATED"
        text = existing.get("_text", "")
        existing.setdefault("_extraction_error", str(exc))

    # Merge: OCR fields win, but never drop planted markers / prior fields.
    merged = {**existing, **ocr_fields}
    merged = _normalize_fields(merged)
    merged["_ocr_provider"] = provider
    merged["_ocr_confidence"] = confidence
    merged["_ocr_mode"] = mode
    if text:
        merged["_text"] = text
    if file_hash:
        merged["_extraction_hash"] = file_hash
        _CACHE[file_hash] = merged

    document.extracted = merged
    db.add(document)
    return merged
