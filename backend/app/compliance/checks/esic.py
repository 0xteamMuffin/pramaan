"""ESIC statutory registration check (STATUTORY).

Applicable mainly to services/labour tenders. Missing registration when mandatory
is a FAIL; when not mandatory it is NOT_APPLICABLE. Contributes to the
shell-company signal (no labour footprint).
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class EsicCheck(Check):
    key = "esic"
    dimension = Dimension.STATUTORY.value

    def applies(self, ctx: CheckContext) -> bool:
        return bool(ctx.identifiers.get("esic")) or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        esic = ctx.identifiers.get("esic")
        data = rules.portal_data(ctx, "esic")
        src, method, mode = rules.portal_meta(ctx, "esic")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "ESIC response", src, method, data))

        if not esic:
            if rules.is_mandatory(ctx):
                return CheckOutput(
                    self.key, self.dimension, Verdict.FAIL.value,
                    summary="ESIC registration mandatory for this tender but not provided",
                    data={"esic": None}, source=src, method=method, mode=mode, evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="ESIC not applicable / not claimed", mode=mode, evidence=evidence,
            )

        if esic and not rules.validate_esic(esic):
            evidence.append(EvidenceItem("rule", "ESIC format check failed", "regex", "ESIC", {"esic": esic}))
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=f"ESIC number '{esic}' fails 17-digit format", data={"esic": esic},
                source="regex", method="ESIC", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "result")
        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"ESIC registration inactive (status={status})",
                data={"esic": esic, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )
        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="ESIC portal returned no record", data={"esic": esic}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="ESIC registration active", data={"esic": esic, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(EsicCheck())
