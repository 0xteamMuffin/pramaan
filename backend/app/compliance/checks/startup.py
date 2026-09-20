"""DPIIT Startup recognition + exemption-scope check (ELIGIBILITY).

Validates DPIIT number/status and flags a startup exemption claimed on a resold /
non-innovative item as a WARN (planted case: B8) — exemptions apply to the
startup's own innovative offering, not general resale.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class StartupCheck(Check):
    key = "startup"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claims = bool(rules.first(flags, "startup", "startup_exemption", "dpiit"))
        return bool(ctx.identifiers.get("dpiit")) or claims or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        dpiit = ctx.identifiers.get("dpiit")
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        claims_exemption = bool(rules.first(flags, "startup_exemption", "startup"))
        data = rules.portal_data(ctx, "startup")
        src, method, mode = rules.portal_meta(ctx, "startup")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "DPIIT/Startup India response", src, method, data))

        if not dpiit and not claims_exemption:
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="Startup recognition not claimed", mode=mode, evidence=evidence,
            )

        if not dpiit:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="Startup exemption claimed but no DPIIT number provided", confidence=0.4,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        if not rules.validate_dpiit(dpiit):
            evidence.append(EvidenceItem("rule", "DPIIT format check failed", "regex", "DPIIT", {"dpiit": dpiit}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"DPIIT number '{dpiit}' fails format DIPP#####", data={"dpiit": dpiit},
                source="regex", method="DPIIT", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "recognition_status", "result")
        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"DPIIT recognition inactive (status={status})",
                data={"dpiit": dpiit, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )

        # Exemption-scope sanity: exemption on a resold / non-innovative item
        resold = bool(rules.first(flags, "resold", "reseller")) or (
            str(rules.first(flags, "item_type", "offering_type") or "").lower() in {"resold", "reseller", "trading"}
        )
        innovative = rules.first(flags, "innovative")
        non_innovative = resold or (innovative is False)
        if claims_exemption and non_innovative:
            evidence.append(
                EvidenceItem(
                    "rule", "Startup exemption scope", "rule", "scope",
                    {"resold": resold, "innovative": innovative},
                )
            )
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary="Startup exemption claimed on a resold/non-innovative item — verify scope",
                data={"dpiit": dpiit, "resold": resold, "innovative": innovative},
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="DPIIT startup recognition valid",
            data={"dpiit": dpiit, "status": status}, source=src, method=method, mode=mode,
            evidence=evidence,
        )


register(StartupCheck())
