"""MCA / CIN corporate-existence check (IDENTITY).

Validates CIN format, portal status (active vs struck-off), and captures the
incorporation year for the shell/vintage detectors. Struck-off -> veto.
Only applies to company/LLP constitutions.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class McaCheck(Check):
    key = "mca"
    dimension = Dimension.IDENTITY.value

    def applies(self, ctx: CheckContext) -> bool:
        # Applies when there's a CIN or the entity is company/LLP-like.
        if ctx.identifiers.get("cin"):
            return True
        return rules.is_company_like(getattr(ctx.bidder, "constitution", None))

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        cin = ctx.identifiers.get("cin")
        constitution = getattr(ctx.bidder, "constitution", None)
        data = rules.portal_data(ctx, "mca")
        src, method, mode = rules.portal_meta(ctx, "mca")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "MCA21 response", src, method, data))

        if not cin:
            # Company-like but no CIN declared -> needs manual verification
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="Company/LLP constitution but no CIN available", confidence=0.4,
                data={"constitution": constitution}, source=src, method=method, mode=mode,
                evidence=evidence,
            )

        if not rules.validate_cin(cin):
            evidence.append(EvidenceItem("rule", "CIN format check failed", "regex", "CIN", {"cin": cin}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"CIN '{cin}' fails format validation", data={"cin": cin},
                source="regex", method="CIN", mode=mode, evidence=evidence,
            )

        year = rules.year_from_cin(cin)
        status = rules.first(data, "status", "company_status", "cin_status", "result")

        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Company struck-off / inactive per MCA (status={status})",
                is_veto=True, data={"cin": cin, "status": status, "incorporation_year": year},
                source=src, method=method, mode=mode, evidence=evidence,
            )
        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="MCA portal returned no data", data={"cin": cin, "incorporation_year": year},
                confidence=0.5, source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"CIN active (incorporated {year})" if year else "CIN active",
            data={"cin": cin, "status": status, "incorporation_year": year},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(McaCheck())
