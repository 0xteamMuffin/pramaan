"""Forgery / tamper detection wrapper.

Delegates to the registry's layered forensic pipeline (PyMuPDF metadata +
PDF incremental-update detection + ELA/copy-move when available, and it honors
the planted `_tamper` marker for deterministic demos). Output is a structured
dict — never an opaque number — so a check can turn it into evidence.

Spec: docs/03-architecture/ai-verification-engine.md §4.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.providers.registry import analyze_forensics


def _read_bytes(document: Any) -> bytes | None:
    uri = getattr(document, "storage_uri", None)
    if not uri:
        return None
    try:
        path = Path(uri)
        if path.exists() and path.is_file():
            return path.read_bytes()
    except (OSError, ValueError):
        return None
    return None


def analyze_document(document: Any) -> dict[str, Any]:
    """Return {verdict, score, findings, method, document_id, doc_type}.

    verdict ∈ {clean, suspect, tampered}. Safe on any input.
    """
    extracted = dict(getattr(document, "extracted", None) or {})
    filename = getattr(document, "storage_uri", "") or getattr(document, "doc_type", "") or ""
    try:
        result = analyze_forensics(_read_bytes(document), filename=filename, hints=extracted)
    except Exception as exc:  # noqa: BLE001 - forensics must never crash a run
        result = {
            "verdict": "unknown",
            "score": 0.0,
            "findings": [{"layer": "error", "detail": str(exc), "severity": "low"}],
            "method": "error",
        }
    result = dict(result or {})
    result.setdefault("verdict", "clean")
    result.setdefault("score", 0.0)
    result.setdefault("findings", [])
    result["document_id"] = getattr(document, "id", None)
    result["doc_type"] = getattr(document, "doc_type", None)
    return result
