"""Domain enums (stored as strings in the DB for portability)."""
from __future__ import annotations

from enum import Enum


class StrEnum(str, Enum):
    def __str__(self) -> str:  # nicer serialization
        return self.value


class Verdict(StrEnum):
    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    UNVERIFIABLE = "UNVERIFIABLE"


class RiskBand(StrEnum):
    LOW = "LOW"       # 70-100  green
    MEDIUM = "MEDIUM"  # 40-69   amber
    HIGH = "HIGH"     # 0-39    red


class ProviderMode(StrEnum):
    LIVE = "LIVE"
    SIMULATED = "SIMULATED"  # deterministic mock
    SNAPSHOT = "SNAPSHOT"    # scraped public dataset


class RunStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class RecommendationStance(StrEnum):
    RECOMMEND_QUALIFY = "RECOMMEND_QUALIFY"
    FURTHER_SCRUTINY = "FURTHER_SCRUTINY"
    RECOMMEND_DISQUALIFY = "RECOMMEND_DISQUALIFY"


class DecisionOutcome(StrEnum):
    QUALIFIED = "QUALIFIED"
    DISQUALIFIED = "DISQUALIFIED"
    ON_HOLD = "ON_HOLD"


class UserRole(StrEnum):
    OFFICER = "OFFICER"
    ANALYST = "ANALYST"
    AUDITOR = "AUDITOR"
    ADMIN = "ADMIN"


class TenderStatus(StrEnum):
    DRAFT = "draft"
    OPEN = "open"
    EVALUATING = "evaluating"
    AWARDED = "awarded"
    CLOSED = "closed"


class IdentifierKind(StrEnum):
    PAN = "PAN"
    GSTIN = "GSTIN"
    UDYAM = "UDYAM"
    CIN = "CIN"
    DIN = "DIN"
    EPFO = "EPFO"
    ESIC = "ESIC"
    DPIIT = "DPIIT"
    NSIC = "NSIC"
    BIS = "BIS"


class EvidenceKind(StrEnum):
    PORTAL_RESPONSE = "portal_response"
    DOCUMENT_FIELD = "document_field"
    FORENSIC = "forensic"
    GRAPH = "graph"
    RULE = "rule"


# Canonical scoring dimensions (weights live in the scoring engine / tender template)
class Dimension(StrEnum):
    IDENTITY = "identity_legal_existence"
    TAX_FINANCIAL = "tax_financial"
    ELIGIBILITY = "eligibility_claim_authenticity"
    INTEGRITY = "integrity_exclusion"
    STATUTORY = "statutory_labour"
    DOCUMENT = "document_integrity"


# Canonical check keys used across engine + providers + frontend
CHECK_KEYS = [
    "pan", "gst", "udyam", "mca", "mii", "epfo", "esic", "nsic",
    "bis", "startup", "oem", "digilocker", "debarment", "turnover",
    "name_reconcile", "experience", "cartel",
]
