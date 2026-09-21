"""Live OCR adapter: Gemini Vision (used on document uploads when a key exists).

Sends the file inline to Gemini and asks for structured JSON fields. Falls back
to FixtureOCR (offline text+regex) on any error via the registry composite.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

import httpx

from app.core.config import settings
from app.providers.base import OCRProvider, OCRResult, ProviderError, RateLimit

_TIMEOUT = httpx.Timeout(45.0, connect=10.0)

_PROMPT = (
    "You are extracting fields from an Indian government / statutory certificate "
    "(Udyam, GST, PAN, MCA, BIS, OEM authorization, EPFO, ESIC, DPIIT, turnover, etc.). "
    "Return ONLY a flat JSON object of the key fields you can read, using snake_case keys "
    "such as pan, gstin, udyam, cin, din, dpiit, bis, name, legal_name, status, "
    "enterprise_type, brand, license_holder, valid_till. Do not invent values; omit unknown keys."
)


def _mime_for(file_bytes: bytes) -> str:
    if file_bytes[:5] == b"%PDF-":
        return "application/pdf"
    if file_bytes[:8].startswith(b"\x89PNG"):
        return "image/png"
    if file_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return "application/octet-stream"


class GeminiVisionOCR(OCRProvider):
    name = "gemini_vision"
    mode = "LIVE"

    def __init__(self, api_key: str, model: str):
        self._key = api_key
        self.model = model

    def extract(self, file_bytes, *, hints=None) -> OCRResult:
        if not file_bytes:
            raise ProviderError("no file bytes for OCR")
        mime = _mime_for(file_bytes)
        body: dict[str, Any] = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": _PROMPT},
                    {"inline_data": {"mime_type": mime,
                                     "data": base64.b64encode(file_bytes).decode()}},
                ],
            }],
            "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json",
                                 "maxOutputTokens": 1024, "thinkingConfig": {"thinkingBudget": 0}},
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        try:
            r = httpx.post(url, params={"key": self._key}, json=body, timeout=_TIMEOUT)
        except httpx.HTTPError as exc:
            raise ProviderError(f"gemini-vision network error: {exc}") from exc
        if r.status_code == 429:
            raise RateLimit("gemini-vision rate limited")
        if r.status_code >= 400:
            raise ProviderError(f"gemini-vision http {r.status_code}: {r.text[:200]}")
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
            fields = json.loads(text) if text else {}
            if not isinstance(fields, dict):
                fields = {}
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"gemini-vision parse error: {exc}") from exc
        return OCRResult(text=text, fields=fields, confidence=0.9,
                         provider=self.name, mode="LIVE")


def gemini_vision_provider() -> OCRProvider | None:
    if not settings.has_gemini:
        return None
    return GeminiVisionOCR(settings.gemini_api_key.strip(),
                           os.environ.get("GEMINI_OCR_MODEL",
                                          os.environ.get("GEMINI_MODEL", "gemini-flash-latest")))
