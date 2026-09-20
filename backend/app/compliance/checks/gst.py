"""GST registration + return-filing check (TAX_FINANCIAL).

Cancelled / inactive GST is a hard veto. Return-filing shortfalls (per tender
param `require_returns`) are WARNs. Missing GSTIN is UNVERIFIABLE (or FAIL only if
mandatory and the entity should be registered).
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class GstCheck(Check):
    key = "gst"
    dimension = Dimension.TAX_FINANCIAL.value

    def applies(self, ctx: CheckContext) -> bool:
        return bool(ctx.identifiers.get("gstin")) or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        gstin = ctx.identifiers.get("gstin")
        data = rules.portal_data(ctx, "gst")
        src, method, mode = rules.portal_meta(ctx, "gst")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "GSTN response", src, method, data))

        if not gstin:
            verdict = Verdict.FAIL.value if rules.is_mandatory(ctx) else Verdict.UNVERIFIABLE.value
            return CheckOutput(
                self.key, self.dimension, verdict,
                summary="No GSTIN provided" + (" (mandatory)" if verdict == Verdict.FAIL.value else ""),
                confidence=0.5, source=src, method=method, mode=mode, evidence=evidence,
            )

        if not rules.validate_gstin(gstin):
            evidence.append(EvidenceItem("rule", "GSTIN format check failed", "regex", "GSTIN", {"gstin": gstin}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"GSTIN '{gstin}' fails 15-char format validation", data={"gstin": gstin},
                source="regex", method="GSTIN", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "gst_status", "registration_status", "result")

        # Cancelled/inactive GST -> veto
        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"GST registration cancelled/inactive (status={status})",
                is_veto=True, data={"gstin": gstin, "status": status},
                source=src, method=method, mode=mode, evidence=evidence,
            )

        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="GST portal returned no data", data={"gstin": gstin}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        # Return-filing regularity (optional param)
        require_returns = rules.param(ctx, "require_returns")
        returns_filed = rules.first(data, "returns_filed", "returns", "gstr_filed")
        if require_returns and returns_filed is not None:
            try:
                if int(returns_filed) < int(require_returns):
                    evidence.append(
                        EvidenceItem(
                            "rule", "GST return-filing shortfall", "rule", "returns",
                            {"filed": returns_filed, "required": require_returns},
                        )
                    )
                    return CheckOutput(
                        self.key, self.dimension, Verdict.WARN.value,
                        summary=f"Only {returns_filed}/{require_returns} recent GST returns filed",
                        data={"gstin": gstin, "status": status, "returns_filed": returns_filed},
                        source=src, method=method, mode=mode, evidence=evidence,
                    )
            except (TypeError, ValueError):
                pass

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"GST active (status={status})",
            data={"gstin": gstin, "status": status, "returns_filed": returns_filed},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(GstCheck())
