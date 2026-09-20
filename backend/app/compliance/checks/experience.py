"""Experience / vintage check (ELIGIBILITY).

Compares claimed years of experience against the tender minimum AND against the
company's incorporation year (CIN) — a bidder cannot have more experience than it
has existed. Consumes the entity-graph shell signal (planted case: B5 claims 5y
experience but CIN was incorporated in 2025 with no EPFO/ESIC footprint).
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


class ExperienceCheck(Check):
    key = "experience"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return (
            ctx.requirement is not None
            or rules.param(ctx, "min_years") is not None
            or rules.param(ctx, "min_experience_years") is not None
        )

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        min_years = _to_float(rules.param(ctx, "min_years", rules.param(ctx, "min_experience_years")))
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claimed = _to_float(rules.first(flags, "experience_years", "experience", "years_experience"))

        shell_map = (ctx.ai.get("graph") or {}).get("shell") or {}
        shell = shell_map.get(getattr(ctx.bidder, "id", None), {})

        evidence = [
            EvidenceItem(
                "rule", "Experience vs incorporation vintage", "graph", "shell-detector",
                {"claimed_years": claimed, "min_years": min_years, "shell": shell},
            )
        ]

        # Vintage contradiction: claims more experience than the company has existed.
        # This is a logical impossibility (material misrepresentation) and, combined
        # with no labour footprint, is the shell-company signal — a veto per
        # docs/03-architecture/ai-verification-engine.md §3.
        if shell.get("vintage_conflict"):
            summary = "; ".join(shell.get("signals") or []) or "Claimed experience exceeds company vintage"
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=summary, is_veto=True, confidence=0.85,
                data={"claimed_years": claimed, "shell": shell},
                source="graph", method="shell-detector", mode="SIMULATED", evidence=evidence,
            )

        if min_years is None:
            # No explicit threshold; report vintage sanity only
            if claimed is not None:
                return CheckOutput(
                    self.key, self.dimension, Verdict.PASS.value,
                    summary=f"{claimed:g}y experience claimed; consistent with vintage",
                    data={"claimed_years": claimed}, mode="SIMULATED", evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="No experience threshold configured", mode="SIMULATED", evidence=evidence,
            )

        if claimed is None:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary=f"Experience ≥ {min_years:g}y required but no data provided", confidence=0.4,
                data={"min_years": min_years}, mode="SIMULATED", evidence=evidence,
            )

        if claimed < min_years:
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Experience {claimed:g}y below required {min_years:g}y",
                data={"claimed_years": claimed, "min_years": min_years},
                mode="SIMULATED", evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"Experience {claimed:g}y meets ≥ {min_years:g}y requirement",
            data={"claimed_years": claimed, "min_years": min_years},
            mode="SIMULATED", evidence=evidence,
        )


register(ExperienceCheck())
