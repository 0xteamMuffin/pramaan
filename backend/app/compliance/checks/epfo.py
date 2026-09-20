"""EPFO (Provident Fund) statutory registration check (STATUTORY).

Applicable mainly to services/labour tenders. Missing registration when mandatory
is a FAIL (labour non-compliance); when not mandatory it is NOT_APPLICABLE. Also
contributes to the shell-company signal (no labour footprint).
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class EpfoCheck(Check):
    key = "epfo"
    dimension = Dimension.STATUTORY.value

    def applies(self, ctx: CheckContext) -> bool:
        return bool(ctx.identifiers.get("epfo")) or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        epfo = ctx.identifiers.get("epfo")
        data = rules.portal_data(ctx, "epfo")
        src, method, mode = rules.portal_meta(ctx, "epfo")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "EPFO response", src, method, data))

        if not epfo:
            if rules.is_mandatory(ctx):
                return CheckOutput(
                    self.key, self.dimension, Verdict.FAIL.value,
                    summary="EPFO registration mandatory for this tender but not provided",
                    data={"epfo": None}, source=src, method=method, mode=mode, evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="EPFO not applicable / not claimed", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "result")
        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"EPFO registration inactive (status={status})",
                data={"epfo": epfo, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )
        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="EPFO portal returned no record", data={"epfo": epfo}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="EPFO registration active", data={"epfo": epfo, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(EpfoCheck())
