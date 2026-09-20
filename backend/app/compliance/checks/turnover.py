"""Turnover threshold check (TAX_FINANCIAL).

Compares the tender's `min_turnover` over `years` against the bidder's declared /
CA-certified turnover figures (from claimed_flags or a turnover certificate doc).
"""
from __future__ import annotations

import re
from typing import Any

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


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


def _collect_turnover(ctx: CheckContext) -> list[float]:
    figures: list[float] = []
    flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
    raw = rules.first(flags, "turnover", "turnover_last3", "annual_turnover", "turnovers")
    if isinstance(raw, (list, tuple)):
        figures.extend(f for f in (_to_float(x) for x in raw) if f is not None)
    elif raw is not None:
        f = _to_float(raw)
        if f is not None:
            figures.append(f)

    for doc in ctx.documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if "turnover" not in dt and "financ" not in dt and "balance" not in dt:
            continue
        extracted = dict(getattr(doc, "extracted", None) or {})
        draw = rules.first(extracted, "turnover", "annual_turnover", "turnovers", "revenue")
        if isinstance(draw, (list, tuple)):
            figures.extend(f for f in (_to_float(x) for x in draw) if f is not None)
        elif draw is not None:
            f = _to_float(draw)
            if f is not None:
                figures.append(f)
    return figures


class TurnoverCheck(Check):
    key = "turnover"
    dimension = Dimension.TAX_FINANCIAL.value

    def applies(self, ctx: CheckContext) -> bool:
        return ctx.requirement is not None or rules.param(ctx, "min_turnover") is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        min_turnover = _to_float(rules.param(ctx, "min_turnover"))
        years = int(rules.param(ctx, "years", 3) or 3)
        figures = _collect_turnover(ctx)
        evidence = [
            EvidenceItem(
                "document_field", "Declared/certified turnover figures", "bidder", "declared",
                {"figures": figures, "min_turnover": min_turnover, "years": years},
            )
        ]

        if min_turnover is None:
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="No turnover threshold configured for this tender",
                mode="SIMULATED", evidence=evidence,
            )

        if not figures:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="No turnover figures available to verify threshold", confidence=0.4,
                data={"min_turnover": min_turnover}, mode="SIMULATED", evidence=evidence,
            )

        considered = sorted(figures, reverse=True)[:years] if len(figures) >= years else figures
        min_seen = min(considered)
        meets = min_seen >= min_turnover

        if meets:
            return CheckOutput(
                self.key, self.dimension, Verdict.PASS.value,
                summary=f"Turnover ≥ {min_turnover:g} met (min observed {min_seen:g})",
                data={"figures": figures, "min_turnover": min_turnover, "min_observed": min_seen},
                mode="SIMULATED", evidence=evidence,
            )

        # Below threshold but some data: FAIL if we have enough years, else WARN
        if len(figures) < years:
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=f"Only {len(figures)}/{years} yrs of turnover data; min {min_seen:g} < {min_turnover:g}",
                data={"figures": figures, "min_turnover": min_turnover}, confidence=0.6,
                mode="SIMULATED", evidence=evidence,
            )
        return CheckOutput(
            self.key, self.dimension, Verdict.FAIL.value,
            summary=f"Turnover below threshold: min {min_seen:g} < required {min_turnover:g}",
            data={"figures": figures, "min_turnover": min_turnover, "min_observed": min_seen},
            mode="SIMULATED", evidence=evidence,
        )


register(TurnoverCheck())
