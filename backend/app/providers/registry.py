"""Provider registry / resolver — the stable facade the rest of the app uses.

Guarantees:
  * Works with an EMPTY .env (deterministic heuristic/fixture/mock fallbacks).
  * Upgrades to LIVE automatically when a key is present.
  * Prefers richer implementations from app.providers.{government,llm,ocr,forensics}
    when the providers agent supplies them, else uses the inline fallbacks below.

Public API (stable — engine/services/API code against THIS):
  get_llm()                       -> LLMProvider  (composite w/ fallback)
  get_ocr()                       -> OCRProvider  (composite w/ fallback)
  get_gov_provider(check_key)     -> GovProvider  (composite: live -> mock/snapshot)
  analyze_forensics(file_bytes, filename, hints) -> dict
  fixture_gov_dir()               -> Path to data/fixtures/gov
"""
from __future__ import annotations

import importlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import REPO_ROOT, settings
from app.providers.base import (
    GovProvider,
    LLMProvider,
    LLMResult,
    OCRProvider,
    OCRResult,
    ProviderError,
    VerifyRequest,
    VerifyResult,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def fixture_gov_dir() -> Path:
    return REPO_ROOT / "data" / "fixtures" / "gov"


def _try_import(path: str):
    try:
        return importlib.import_module(path)
    except Exception:  # noqa: BLE001
        return None


# --------------------------------------------------------------------------- #
# Inline fallback: Heuristic LLM (deterministic, no key)
# --------------------------------------------------------------------------- #
class HeuristicLLM(LLMProvider):
    """Deterministic, offline LLM stand-in.

    It never invents facts. If a json_schema is requested and the caller embeds a
    JSON object after the marker '<<JSON>>' in the last user message, it echoes
    that object back as `data`. Otherwise it returns a concise deterministic text
    summary of the provided content. The engine composes real rationale from
    structured data, so this passthrough is safe and reproducible.
    """

    name = "heuristic"
    mode = "SIMULATED"

    def complete(self, messages, *, json_schema=None, **kw) -> LLMResult:
        last = messages[-1]["content"] if messages else ""
        data: dict[str, Any] | None = None
        if json_schema is not None and "<<JSON>>" in last:
            try:
                data = json.loads(last.split("<<JSON>>", 1)[1].strip())
            except Exception:  # noqa: BLE001
                data = {}
        text = last.strip()
        if len(text) > 1200:
            text = text[:1200] + "…"
        return LLMResult(text=text, data=data, provider=self.name, model="heuristic", mode="SIMULATED")


# --------------------------------------------------------------------------- #
# Inline fallback: Fixture OCR (reads known synthetic fields from hints)
# --------------------------------------------------------------------------- #
class FixtureOCR(OCRProvider):
    """Returns the document's already-known fields (from seed) — offline safe."""

    name = "fixture"
    mode = "SIMULATED"

    def extract(self, file_bytes, *, hints=None) -> OCRResult:
        hints = hints or {}
        fields = dict(hints.get("fields") or hints.get("extracted") or {})
        text = hints.get("text", "")
        return OCRResult(
            text=text, fields=fields, confidence=float(hints.get("confidence", 0.95)),
            provider=self.name, mode="SIMULATED",
        )


# --------------------------------------------------------------------------- #
# Inline fallback: Mock government provider (deterministic, fixture-driven)
# --------------------------------------------------------------------------- #
class MockGovProvider(GovProvider):
    """Deterministic mock for one check.

    Resolution order for a response payload:
      1) data/fixtures/gov/<check_key>/<id>.json  (planted frauds live here)
      2) synthesized 'valid/active' response from the request identifiers.
    """

    SOURCE_NAMES = {
        "gst": "GSTN", "pan": "Income Tax/CBDT", "udyam": "Udyam/MSME",
        "mca": "MCA21", "epfo": "EPFO", "esic": "ESIC", "nsic": "NSIC",
        "bis": "BIS", "startup": "DPIIT/Startup India", "oem": "GeM OEM Panel",
        "digilocker": "DigiLocker",
    }

    def __init__(self, check_key: str):
        self.check_key = check_key
        self.mode = "SIMULATED"

    def _primary_id(self, req: VerifyRequest) -> str | None:
        order = {
            "gst": "gstin", "pan": "pan", "udyam": "udyam", "mca": "cin",
            "epfo": "epfo", "esic": "esic", "nsic": "nsic", "bis": "bis",
            "startup": "dpiit", "oem": "oem", "digilocker": "pan",
        }
        key = order.get(self.check_key)
        if key and req.identifiers.get(key):
            return req.identifiers[key]
        # fallback: any identifier
        for v in req.identifiers.values():
            if v:
                return v
        return None

    def _load_fixture(self, ident: str) -> dict | None:
        p = fixture_gov_dir() / self.check_key / f"{ident}.json"
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                return None
        return None

    def verify(self, req: VerifyRequest) -> VerifyResult:
        ident = self._primary_id(req)
        src = f"{self.SOURCE_NAMES.get(self.check_key, self.check_key.upper())} (simulated)"
        payload: dict[str, Any] = {}
        if ident:
            fx = self._load_fixture(ident)
            if fx is not None:
                payload = fx
        if not payload:
            # synthesize a plausible 'active/valid' response
            payload = {
                "status": "Active",
                "valid": True,
                "identifier": ident,
                "name": req.bidder.get("legal_name"),
                "note": "synthesized-default",
            }
        return VerifyResult(
            ok=True, data=payload, source=src, method="mock",
            mode="SIMULATED", confidence=0.9, observed_at=_now(), raw=payload,
        )


# --------------------------------------------------------------------------- #
# Composite providers with fallback chains
# --------------------------------------------------------------------------- #
class _FallbackLLM(LLMProvider):
    name = "composite-llm"

    def __init__(self, chain: list[LLMProvider]):
        self._chain = chain
        self.mode = chain[0].mode if chain else "SIMULATED"

    def complete(self, messages, *, json_schema=None, **kw) -> LLMResult:
        last_err: Exception | None = None
        for p in self._chain:
            try:
                return p.complete(messages, json_schema=json_schema, **kw)
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                continue
        # ultimate safety net
        return HeuristicLLM().complete(messages, json_schema=json_schema, **kw)


class _FallbackOCR(OCRProvider):
    name = "composite-ocr"

    def __init__(self, chain: list[OCRProvider]):
        self._chain = chain
        self.mode = chain[0].mode if chain else "SIMULATED"

    def extract(self, file_bytes, *, hints=None) -> OCRResult:
        for p in self._chain:
            try:
                return p.extract(file_bytes, hints=hints)
            except Exception:  # noqa: BLE001
                continue
        return FixtureOCR().extract(file_bytes, hints=hints)


class _FallbackGov(GovProvider):
    def __init__(self, check_key: str, chain: list[GovProvider]):
        self.check_key = check_key
        self._chain = chain
        self.mode = chain[0].mode if chain else "SIMULATED"

    def verify(self, req: VerifyRequest) -> VerifyResult:
        last_err: Exception | None = None
        for p in self._chain:
            try:
                res = p.verify(req)
                if res.ok:
                    return res
            except (ProviderError, Exception) as exc:  # noqa: BLE001
                last_err = exc
                continue
        return MockGovProvider(self.check_key).verify(req)


# --------------------------------------------------------------------------- #
# Resolvers
# --------------------------------------------------------------------------- #
def get_llm() -> LLMProvider:
    chain: list[LLMProvider] = []
    live_mod = _try_import("app.providers.llm.live")
    if live_mod:
        for factory in ("gemini_provider", "openai_compat_provider"):
            fn = getattr(live_mod, factory, None)
            if fn:
                try:
                    prov = fn()
                    if prov is not None:
                        chain.append(prov)
                except Exception:  # noqa: BLE001
                    pass
    chain.append(HeuristicLLM())
    return _FallbackLLM(chain)


def get_ocr() -> OCRProvider:
    chain: list[OCRProvider] = []
    live_mod = _try_import("app.providers.ocr.live")
    if live_mod and getattr(live_mod, "gemini_vision_provider", None):
        try:
            prov = live_mod.gemini_vision_provider()
            if prov is not None:
                chain.append(prov)
        except Exception:  # noqa: BLE001
            pass
    chain.append(FixtureOCR())
    return _FallbackOCR(chain)


def get_gov_provider(check_key: str) -> GovProvider:
    chain: list[GovProvider] = []
    # live sandbox adapter first (only if keys present)
    if settings.has_sandbox:
        live_mod = _try_import("app.providers.government.live")
        if live_mod and getattr(live_mod, "sandbox_provider", None):
            try:
                prov = live_mod.sandbox_provider(check_key)
                if prov is not None:
                    chain.append(prov)
            except Exception:  # noqa: BLE001
                pass
    # richer mock from providers agent, else inline mock
    mock_mod = _try_import("app.providers.government.mock")
    if mock_mod and getattr(mock_mod, "mock_provider", None):
        try:
            prov = mock_mod.mock_provider(check_key)
            if prov is not None:
                chain.append(prov)
        except Exception:  # noqa: BLE001
            pass
    chain.append(MockGovProvider(check_key))
    return _FallbackGov(check_key, chain)


def analyze_forensics(file_bytes: bytes | None, filename: str = "", hints: dict | None = None) -> dict:
    """Run the forensics pipeline; prefer the providers-agent module if present."""
    fx = _try_import("app.providers.forensics")
    if fx and getattr(fx, "analyze", None):
        try:
            return fx.analyze(file_bytes, filename=filename, hints=hints or {})
        except Exception:  # noqa: BLE001
            pass
    return _inline_forensics(file_bytes, filename, hints or {})


def _inline_forensics(file_bytes: bytes | None, filename: str, hints: dict) -> dict:
    """Minimal but real forensic signal + honors a planted marker for the demo."""
    findings: list[dict[str, Any]] = []
    score = 0.0
    planted = bool(hints.get("_tamper"))
    if planted:
        findings.append({"layer": "planted", "detail": hints.get("_tamper_reason", "known tampered sample"), "severity": "high"})
        score += 0.8
    if file_bytes:
        head = file_bytes[:1024]
        if b"%PDF" in head:
            eof_count = file_bytes.count(b"%%EOF")
            if eof_count > 1:
                findings.append({"layer": "metadata", "detail": f"PDF has {eof_count} incremental-update saves (post-signing edit signal)", "severity": "medium"})
                score += 0.35
    verdict = "tampered" if score >= 0.7 else ("suspect" if score >= 0.3 else "clean")
    return {"verdict": verdict, "score": round(min(score, 1.0), 2), "findings": findings, "method": "inline"}
