"""Provider abstraction contracts.

Two families:
  * Government data providers (GovProvider) — one logical check each, with
    Live / Mock / Snapshot implementations selected by config.
  * AI providers (LLMProvider, OCRProvider) — real when a key is present,
    else a deterministic Heuristic/Fixture fallback so the app runs with an
    empty .env.

Spec: docs/03-architecture/provider-abstraction.md
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Iterable


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Government providers
# --------------------------------------------------------------------------- #
@dataclass
class VerifyRequest:
    check_key: str
    identifiers: dict[str, str] = field(default_factory=dict)  # {"pan": "...", "gstin": "..."}
    bidder: dict[str, Any] = field(default_factory=dict)       # snapshot of bidder fields
    params: dict[str, Any] = field(default_factory=dict)       # tender rule params
    context: dict[str, Any] = field(default_factory=dict)      # extracted docs, tender, etc.


@dataclass
class VerifyResult:
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    source: str = ""            # e.g. "GSTN (sandbox)" / "GSTN (simulated)"
    method: str = ""            # api-live / mock / snapshot
    mode: str = "SIMULATED"     # LIVE / SIMULATED / SNAPSHOT
    confidence: float = 1.0
    observed_at: datetime = field(default_factory=_now)
    raw: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class GovProvider(abc.ABC):
    """A single government check with a specific mode."""

    check_key: str = ""
    mode: str = "SIMULATED"     # LIVE / SIMULATED / SNAPSHOT

    @abc.abstractmethod
    def verify(self, req: VerifyRequest) -> VerifyResult:  # pragma: no cover - interface
        ...


# --------------------------------------------------------------------------- #
# AI providers
# --------------------------------------------------------------------------- #
@dataclass
class LLMResult:
    text: str = ""
    data: dict[str, Any] | None = None   # parsed JSON if json_schema requested
    provider: str = ""
    model: str = ""
    mode: str = "SIMULATED"              # LIVE / SIMULATED


@dataclass
class OCRResult:
    text: str = ""
    fields: dict[str, Any] = field(default_factory=dict)
    blocks: list[dict[str, Any]] = field(default_factory=list)
    tables: list[Any] = field(default_factory=list)
    confidence: float = 1.0
    provider: str = ""
    mode: str = "SIMULATED"


class LLMProvider(abc.ABC):
    name: str = ""
    mode: str = "SIMULATED"

    @abc.abstractmethod
    def complete(
        self, messages: list[dict[str, str]], *, json_schema: dict | None = None, **kw: Any
    ) -> LLMResult:  # pragma: no cover - interface
        ...


class OCRProvider(abc.ABC):
    name: str = ""
    mode: str = "SIMULATED"

    @abc.abstractmethod
    def extract(self, file_bytes: bytes, *, hints: dict | None = None) -> OCRResult:  # pragma: no cover
        ...


# --------------------------------------------------------------------------- #
# Fallback chain
# --------------------------------------------------------------------------- #
class ProviderError(Exception):
    ...


class RateLimit(ProviderError):
    ...


class AllProvidersFailed(ProviderError):
    ...


def run_with_fallback(chain: Iterable[Any], call: Callable[[Any], Any]) -> Any:
    """Try each provider in order; move on for rate-limit / provider errors."""
    last: Exception | None = None
    for provider in chain:
        try:
            return call(provider)
        except (RateLimit, ProviderError, TimeoutError) as exc:  # pragma: no cover - runtime
            last = exc
            continue
    raise AllProvidersFailed(str(last) if last else "no providers configured")
