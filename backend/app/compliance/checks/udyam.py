"""Udyam / MSME registration + classification-sanity check (ELIGIBILITY).

Validates Udyam number format + portal status and flags a classification that is
inconsistent with the bidder's turnover scale (e.g. "Micro" claim with turnover
well above the ₹5 cr ceiling) as a WARN for manual review.
"""
from __future__ import annotations

import re
from typing import Any

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict

# MSME turnover ceilings (₹) per revised classification.
_CLASS_TURNOVER_CEILING = {
    "micro": 50_000_000,       # ₹5 cr
    "small": 500_000_000,      # ₹50 cr
    "medium": 2_500_000_000,   # ₹250 cr
}


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = re.sub(r"[^0-9.]", "", str(value))
    try:
        return float(s) if s else None
    except ValueError:
        return None


def _max_turnover(ctx: CheckContext) -> float | None:
    flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
    raw = rules.first(flags, "turnover", "turnover_last3", "annual_turnover")
    values: list[float] = []
    if isinstance(raw, (list, tuple)):
        values.extend(f for f in (_to_float(x) for x in raw) if f is not None)
    elif raw is not None:
        f = _to_float(raw)
        if f is not None:
            values.append(f)
    return max(values) if values else None


class UdyamCheck(Check):
    key = "udyam"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claims_mse = bool(rules.first(flags, "mse_class", "enterprise_type", "udyam_class", "msme"))
        return bool(ctx.identifiers.get("udyam")) or claims_mse or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        udyam = ctx.identifiers.get("udyam")
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claimed_class = rules.first(flags, "mse_class", "enterprise_type", "udyam_class")
        data = rules.portal_data(ctx, "udyam")
        src, method, mode = rules.portal_meta(ctx, "udyam")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "Udyam/MSME response", src, method, data))

        if not udyam:
            verdict = Verdict.UNVERIFIABLE.value if rules.is_mandatory(ctx, False) is False else Verdict.UNVERIFIABLE.value
            return CheckOutput(
                self.key, self.dimension, verdict,
                summary="No Udyam registration number available", confidence=0.4,
                data={"claimed_class": claimed_class}, source=src, method=method, mode=mode,
                evidence=evidence,
            )

        if not rules.validate_udyam(udyam):
            evidence.append(EvidenceItem("rule", "Udyam format check failed", "regex", "UDYAM", {"udyam": udyam}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Udyam '{udyam}' fails format UDYAM-SS-DD-NNNNNNN", data={"udyam": udyam},
                source="regex", method="UDYAM", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "result")
        portal_class = rules.first(data, "enterprise_type", "class", "category")
        eff_class = str(portal_class or claimed_class or "").strip().lower()

        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Udyam registration inactive (status={status})",
                data={"udyam": udyam, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )

        # Classification sanity vs turnover
        max_turnover = _max_turnover(ctx)
        ceiling = _CLASS_TURNOVER_CEILING.get(eff_class)
        if ceiling and max_turnover and max_turnover > ceiling:
            evidence.append(
                EvidenceItem(
                    "rule", "MSME classification vs turnover", "rule", "class-sanity",
                    {"claimed_class": eff_class, "turnover": max_turnover, "ceiling": ceiling},
                )
            )
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=(
                    f"'{eff_class.title()}' classification inconsistent with turnover "
                    f"{max_turnover:g} (exceeds {ceiling:g} ceiling)"
                ),
                data={"udyam": udyam, "class": eff_class, "turnover": max_turnover},
                source=src, method=method, mode=mode, evidence=evidence,
            )

        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="Udyam portal returned no data", data={"udyam": udyam}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"Udyam valid ({eff_class or 'registered'})",
            data={"udyam": udyam, "class": eff_class, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(UdyamCheck())
