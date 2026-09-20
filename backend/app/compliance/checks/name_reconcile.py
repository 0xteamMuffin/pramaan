"""Name & constitution reconciliation (IDENTITY).

Mirrors the crosscheck findings (fuzzy name match across PAN/GST/Udyam/MCA +
constitution vs PAN 4th char) into a scored check result.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class NameReconcileCheck(Check):
    key = "name_reconcile"
    dimension = Dimension.IDENTITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return True

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        cross = ctx.ai.get("crosscheck") or {}
        name = cross.get("name") or {}
        constitution = cross.get("constitution") or {}

        evidence = [
            EvidenceItem(
                "rule", "Name reconciliation (token-set fuzzy match)", "crosscheck",
                "fuzzy", {"pairwise": name.get("pairwise"), "min_score": name.get("min_score")},
            )
        ]
        if constitution.get("actual_char"):
            evidence.append(
                EvidenceItem(
                    "rule", "Constitution vs PAN holder-type", "crosscheck", "pan-4th-char",
                    {
                        "declared": constitution.get("declared"),
                        "expected_char": constitution.get("expected_char"),
                        "actual_char": constitution.get("actual_char"),
                    },
                )
            )

        details = [d for d in (name.get("detail"), constitution.get("detail")) if d]

        if name.get("mismatch") or constitution.get("mismatch"):
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary="; ".join(details) or "Name/constitution inconsistency detected",
                confidence=0.8, data={"name": name, "constitution": constitution},
                source="crosscheck", method="fuzzy+pan-4th-char", mode="SIMULATED", evidence=evidence,
            )

        if name.get("pairwise"):
            return CheckOutput(
                self.key, self.dimension, Verdict.PASS.value,
                summary=f"Names consistent across sources (min {name.get('min_score')}%)",
                data={"name": name, "constitution": constitution},
                source="crosscheck", method="fuzzy+pan-4th-char", mode="SIMULATED", evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.UNVERIFIABLE.value,
            summary="No corroborating name sources to reconcile", confidence=0.4,
            data={"name": name, "constitution": constitution},
            source="crosscheck", method="fuzzy", mode="SIMULATED", evidence=evidence,
        )


register(NameReconcileCheck())
