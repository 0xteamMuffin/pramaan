"""Make-in-India (PPP-MII) local-content check (ELIGIBILITY).

Class-I requires ≥50% local content (LC); Class-II requires >20% (and <50%).
Flags: Class-I claim on imported/low-LC goods, class below the tender's min_class,
and missing CA/CS local-content certificate above the value threshold.
"""
from __future__ import annotations

import re
from typing import Any

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict

_CLASS_MIN_LC = {"I": 50.0, "II": 20.0}
_CLASS_RANK = {"II": 1, "I": 2}  # I is stricter/higher


def _norm_class(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip().upper().replace("CLASS", "").replace("-", "").replace(" ", "")
    if s in ("I", "1"):
        return "I"
    if s in ("II", "2"):
        return "II"
    return None


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


def _has_lc_certificate(ctx: CheckContext) -> bool:
    for doc in ctx.documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if "local_content" in dt or "lc_cert" in dt or ("mii" in dt and "cert" in dt):
            return True
    return False


class MiiCheck(Check):
    key = "mii"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claims = rules.first(flags, "mii_class", "local_content_pct", "local_content") is not None
        return ctx.requirement is not None or claims

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claimed_class = _norm_class(rules.first(flags, "mii_class", "mii", "class"))
        lc = _to_float(rules.first(flags, "local_content_pct", "local_content", "lc_pct"))
        min_class = _norm_class(rules.param(ctx, "min_class"))
        quoted = _to_float(getattr(ctx.bid, "quoted_value", None))
        cert_threshold = _to_float(rules.param(ctx, "cert_threshold_value", 100_000_000))  # ₹10 cr default

        evidence = [
            EvidenceItem(
                "document_field", "MII local-content declaration", "bidder", "declared",
                {"claimed_class": claimed_class, "local_content_pct": lc, "min_class": min_class},
            )
        ]

        if min_class is None and claimed_class is None and lc is None:
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="MII not required and not claimed", mode="SIMULATED", evidence=evidence,
            )

        # 1) Class-I claim on imported / low-LC goods
        if claimed_class == "I" and lc is not None and lc < _CLASS_MIN_LC["I"]:
            imported = lc < _CLASS_MIN_LC["II"]
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=(
                    f"Class-I claimed but local content {lc:g}% < 50% required"
                    + (" (goods appear imported)" if imported else "")
                ),
                data={"claimed_class": claimed_class, "local_content_pct": lc},
                mode="SIMULATED", evidence=evidence,
            )
        if claimed_class == "II" and lc is not None and lc <= _CLASS_MIN_LC["II"]:
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Class-II claimed but local content {lc:g}% not >20%",
                data={"claimed_class": claimed_class, "local_content_pct": lc},
                mode="SIMULATED", evidence=evidence,
            )

        # 2) meets tender's minimum class?
        if min_class:
            eff_rank = _CLASS_RANK.get(claimed_class or "", 0)
            need_rank = _CLASS_RANK.get(min_class, 0)
            if eff_rank < need_rank:
                return CheckOutput(
                    self.key, self.dimension, Verdict.FAIL.value,
                    summary=f"Tender requires MII Class-{min_class}; bidder is Class-{claimed_class or 'none'}",
                    data={"claimed_class": claimed_class, "min_class": min_class},
                    mode="SIMULATED", evidence=evidence,
                )

        # 3) CA/CS certificate above value threshold
        if quoted and cert_threshold and quoted >= cert_threshold and (claimed_class or lc) and not _has_lc_certificate(ctx):
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=(
                    f"Order value {quoted:g} ≥ {cert_threshold:g}: CA/CS local-content "
                    "certificate required but not found"
                ),
                data={"quoted": quoted, "cert_threshold": cert_threshold},
                mode="SIMULATED", evidence=evidence,
            )

        if claimed_class or lc is not None:
            return CheckOutput(
                self.key, self.dimension, Verdict.PASS.value,
                summary=f"MII Class-{claimed_class or '?'} consistent (LC {lc:g}%)" if lc is not None
                else f"MII Class-{claimed_class} claim consistent",
                data={"claimed_class": claimed_class, "local_content_pct": lc},
                mode="SIMULATED", evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.UNVERIFIABLE.value,
            summary="MII required but no local-content data provided", confidence=0.4,
            mode="SIMULATED", evidence=evidence,
        )


register(MiiCheck())
