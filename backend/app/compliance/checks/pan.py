"""PAN identity check (IDENTITY).

Validates PAN format + holder-type, honors the cross-portal PAN-mismatch signal
(identity-fraud veto), and reflects the CBDT/portal status.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class PanCheck(Check):
    key = "pan"
    dimension = Dimension.IDENTITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return True  # identity is always-on

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        pan = ctx.identifiers.get("pan") or getattr(ctx.bidder, "primary_pan", None)
        cross = (ctx.ai.get("crosscheck") or {}).get("pan", {})
        data = rules.portal_data(ctx, "pan")
        src, method, mode = rules.portal_meta(ctx, "pan")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(
                EvidenceItem("portal_response", "PAN portal response", src, method, data)
            )

        # 1) identity-fraud veto: PAN differs across sources
        if cross.get("mismatch"):
            evidence.append(
                EvidenceItem(
                    "rule",
                    "PAN mismatch across sources",
                    "crosscheck",
                    "pan-join",
                    {"sources": cross.get("sources"), "distinct": cross.get("distinct")},
                )
            )
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=cross.get("detail") or "PAN mismatch across portals (identity fraud)",
                is_veto=True, confidence=0.95, data={"pan": pan, "crosscheck": cross},
                source=src or "crosscheck", method=method or "pan-join", mode=mode, evidence=evidence,
            )

        # 2) no PAN available -> unverifiable (not a failure)
        if not pan:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="No PAN available for verification", confidence=0.4,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        # 3) format
        if not rules.validate_pan(pan):
            evidence.append(EvidenceItem("rule", "PAN format check failed", "regex", "PAN", {"pan": pan}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"PAN '{pan}' fails format ^[A-Z]{{5}}[0-9]{{4}}[A-Z]$",
                data={"pan": pan}, source="regex", method="PAN", mode=mode, evidence=evidence,
            )

        holder = rules.pan_holder_type(pan)

        # 4) portal status
        status = rules.first(data, "status", "pan_status", "result")
        valid_flag = data.get("valid") if data else None
        if data and (rules.status_is_inactive(status) or valid_flag is False):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"PAN reported inactive/invalid by portal (status={status})",
                data={"pan": pan, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )
        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="PAN portal returned no data", data={"pan": pan}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"PAN valid and active ({holder})",
            data={"pan": pan, "holder_type": holder, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(PanCheck())
