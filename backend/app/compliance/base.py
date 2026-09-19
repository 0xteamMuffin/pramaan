"""Compliance check contract + shared scoring constants.

Spec: docs/03-architecture/compliance-engine.md

Each check is a small, testable unit:
  applies(ctx) -> bool          # tender-conditional
  evaluate(ctx) -> CheckOutput  # PASS/WARN/FAIL/NOT_APPLICABLE/UNVERIFIABLE (+evidence)

AI outputs (extraction, forgery, graph) are fed in via CheckContext and always
converted to structured CheckOutput+evidence — never an opaque number.
"""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any

from app.models.enums import Dimension, Verdict

# Default dimension weights (configurable per tender via weight_override).
DIMENSION_WEIGHTS: dict[str, float] = {
    Dimension.IDENTITY.value: 0.25,
    Dimension.TAX_FINANCIAL.value: 0.20,
    Dimension.ELIGIBILITY.value: 0.20,
    Dimension.INTEGRITY.value: 0.15,
    Dimension.STATUTORY.value: 0.10,
    Dimension.DOCUMENT.value: 0.10,
}

# Credit awarded per verdict (WARN = partial). NA/UNVERIFIABLE excluded from denominator.
VERDICT_CREDIT: dict[str, float] = {
    Verdict.PASS.value: 1.0,
    Verdict.WARN.value: 0.5,
    Verdict.FAIL.value: 0.0,
}

# RAG band thresholds
BAND_LOW_MIN = 70
BAND_MEDIUM_MIN = 40
VETO_SCORE_CAP = 39  # any veto caps the score into HIGH


@dataclass
class EvidenceItem:
    kind: str                       # portal_response/document_field/forensic/graph/rule
    label: str
    source: str | None = None
    method: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    document_id: str | None = None


@dataclass
class CheckOutput:
    check_key: str
    dimension: str
    verdict: str                    # Verdict value
    summary: str = ""
    confidence: float = 1.0
    is_veto: bool = False
    data: dict[str, Any] = field(default_factory=dict)
    source: str | None = None
    method: str | None = None
    mode: str | None = None         # LIVE / SIMULATED / SNAPSHOT
    evidence: list[EvidenceItem] = field(default_factory=list)


@dataclass
class CheckContext:
    """Everything a check needs. Populated by the orchestrator."""

    tender: Any                     # Tender ORM (or dict)
    bidder: Any                     # Bidder ORM (or dict)
    bid: Any                        # Bid ORM (or dict)
    requirement: Any | None = None  # TenderRequirement for this check (mandatory/params)
    params: dict[str, Any] = field(default_factory=dict)
    identifiers: dict[str, str] = field(default_factory=dict)  # normalized {kind: value}
    documents: list[Any] = field(default_factory=list)         # Document ORM list w/ extracted fields
    portal: dict[str, Any] = field(default_factory=dict)       # {check_key: VerifyResult-like dict}
    ai: dict[str, Any] = field(default_factory=dict)           # crosscheck/forgery/graph findings
    extras: dict[str, Any] = field(default_factory=dict)


class Check(abc.ABC):
    key: str = ""
    dimension: str = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        """Default: applies if a requirement exists and is mandatory, else True."""
        if ctx.requirement is None:
            return True
        return True

    @abc.abstractmethod
    def evaluate(self, ctx: CheckContext) -> CheckOutput:  # pragma: no cover - interface
        ...


# Registry populated by app.compliance.checks
CHECK_REGISTRY: dict[str, Check] = {}


def register(check: Check) -> Check:
    CHECK_REGISTRY[check.key] = check
    return check
