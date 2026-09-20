"""Debarment / blacklist screening (INTEGRITY, veto-capable).

Screens the bidder against the debarment snapshot on name (fuzzy) + exact
PAN/CIN and every director DIN (defeats re-incorporation). Any match is a hard
veto (planted cases: B9 director DIN, a director of B3).
Spec: docs/03-architecture/compliance-engine.md §3.
"""
from __future__ import annotations

from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict
from app.services import debarment as debarment_service


class DebarmentCheck(Check):
    key = "debarment"
    dimension = Dimension.INTEGRITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return True  # integrity screening is always-on

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        db = ctx.extras.get("db")
        name = getattr(ctx.bidder, "legal_name", None) or ""
        pan = ctx.identifiers.get("pan") or getattr(ctx.bidder, "primary_pan", None)
        cin = ctx.identifiers.get("cin")
        dins = list(ctx.extras.get("dins") or [])
        if not dins:
            for ident in getattr(ctx.bidder, "identifiers", None) or []:
                if str(getattr(ident, "kind", "")).lower() == "din" and getattr(ident, "value", None):
                    dins.append(ident.value)

        if db is None:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="Debarment database session unavailable", confidence=0.3,
                source="debarment-snapshot", method="screen", mode="SNAPSHOT",
            )

        matches = debarment_service.screen_bidder(db, name=name, pan=pan, cin=cin, dins=dins)

        if matches:
            top = matches[0]
            evidence = [
                EvidenceItem(
                    "rule", f"Debarment match: {m.get('match_reason')}", m.get("source"), "screen",
                    m,
                )
                for m in matches[:5]
            ]
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=(
                    f"Debarred: {top.get('entity_name')} — {top.get('match_reason')} "
                    f"({top.get('source')}, grounds: {top.get('grounds')})"
                ),
                is_veto=True, confidence=0.95, data={"matches": matches},
                source=top.get("source") or "debarment-snapshot", method="screen", mode="SNAPSHOT",
                evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="No debarment/blacklist match (name, PAN, CIN, director DINs)",
            data={"screened_dins": len(dins)}, source="debarment-snapshot", method="screen",
            mode="SNAPSHOT",
        )


register(DebarmentCheck())
