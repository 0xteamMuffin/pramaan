"""Live LLM adapters (used only when a key is present; httpx-only, no SDK).

Registry calls `gemini_provider()` then `openai_compat_provider()`; each returns
None when its key is absent, so the chain silently falls back to HeuristicLLM.
Any request-time failure raises ProviderError and the composite falls back too.
"""
from __future__ import annotations

import json
import os
from typing import Any

import httpx

from app.core.config import settings
from app.providers.base import LLMProvider, LLMResult, ProviderError, RateLimit

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


def _extract_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        start, end = text.find("{"), text.rfind("}")
        if 0 <= start < end:
            try:
                return json.loads(text[start : end + 1])
            except Exception:  # noqa: BLE001
                return None
    return None


# --------------------------------------------------------------------------- #
# Google Gemini (Generative Language REST API)
# --------------------------------------------------------------------------- #
class GeminiLLM(LLMProvider):
    name = "gemini"
    mode = "LIVE"

    def __init__(self, api_key: str, model: str):
        self._key = api_key
        self.model = model

    def complete(self, messages, *, json_schema=None, **kw) -> LLMResult:
        system = "\n".join(m["content"] for m in messages if m.get("role") == "system")
        turns = [m for m in messages if m.get("role") != "system"]
        contents = [
            {"role": "model" if m.get("role") == "assistant" else "user",
             "parts": [{"text": m.get("content", "")}]}
            for m in turns
        ]
        gen: dict[str, Any] = {"temperature": float(kw.get("temperature", 0.2)),
                               "maxOutputTokens": int(kw.get("max_tokens", 1024)),
                               "thinkingConfig": {"thinkingBudget": 0}}
        if json_schema is not None:
            gen["responseMimeType"] = "application/json"
        body: dict[str, Any] = {"contents": contents, "generationConfig": gen}
        if system:
            body["system_instruction"] = {"parts": [{"text": system}]}

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        try:
            r = httpx.post(url, params={"key": self._key}, json=body, timeout=_TIMEOUT)
        except httpx.HTTPError as exc:
            raise ProviderError(f"gemini network error: {exc}") from exc
        if r.status_code == 429:
            raise RateLimit("gemini rate limited")
        if r.status_code >= 400:
            raise ProviderError(f"gemini http {r.status_code}: {r.text[:200]}")
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"gemini parse error: {exc}") from exc
        return LLMResult(text=text, data=_extract_json(text) if json_schema else None,
                         provider=self.name, model=self.model, mode="LIVE")


def gemini_provider() -> LLMProvider | None:
    if not settings.has_gemini:
        return None
    return GeminiLLM(settings.gemini_api_key.strip(),
                     os.environ.get("GEMINI_MODEL", "gemini-flash-latest"))


# --------------------------------------------------------------------------- #
# OpenAI-compatible (Groq / OpenRouter / Ollama)
# --------------------------------------------------------------------------- #
class OpenAICompatLLM(LLMProvider):
    def __init__(self, name: str, base_url: str, model: str, api_key: str | None):
        self.name = name
        self.mode = "LIVE"
        self._base = base_url.rstrip("/")
        self.model = model
        self._key = api_key

    def complete(self, messages, *, json_schema=None, **kw) -> LLMResult:
        headers = {"Content-Type": "application/json"}
        if self._key:
            headers["Authorization"] = f"Bearer {self._key}"
        body: dict[str, Any] = {
            "model": self.model, "messages": messages,
            "temperature": float(kw.get("temperature", 0.2)),
            "max_tokens": int(kw.get("max_tokens", 1024)),
        }
        if json_schema is not None:
            body["response_format"] = {"type": "json_object"}
        try:
            r = httpx.post(f"{self._base}/chat/completions", headers=headers, json=body, timeout=_TIMEOUT)
        except httpx.HTTPError as exc:
            raise ProviderError(f"{self.name} network error: {exc}") from exc
        if r.status_code == 429:
            raise RateLimit(f"{self.name} rate limited")
        if r.status_code >= 400:
            raise ProviderError(f"{self.name} http {r.status_code}: {r.text[:200]}")
        try:
            text = r.json()["choices"][0]["message"]["content"].strip()
        except Exception as exc:  # noqa: BLE001
            raise ProviderError(f"{self.name} parse error: {exc}") from exc
        return LLMResult(text=text, data=_extract_json(text) if json_schema else None,
                         provider=self.name, model=self.model, mode="LIVE")


def openai_compat_provider() -> LLMProvider | None:
    if settings.has_groq:
        return OpenAICompatLLM("groq", "https://api.groq.com/openai/v1",
                               os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b"),
                               settings.groq_api_key.strip())
    if settings.has_openrouter:
        return OpenAICompatLLM("openrouter", "https://openrouter.ai/api/v1",
                               os.environ.get("OPENROUTER_MODEL",
                                              "meta-llama/llama-3.1-8b-instruct:free"),
                               settings.openrouter_api_key.strip())
    return None
