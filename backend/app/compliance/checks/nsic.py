"""NSIC registration check (ELIGIBILITY). Optional — verifies validity/expiry."""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class NsicCheck(Check):
    key = "nsic"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        return bool(ctx.identifiers.get("nsic")) or bool(flags.get("nsic")) or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        nsic = ctx.identifiers.get("nsic")
        data = rules.portal_data(ctx, "nsic")
        src, method, mode = rules.portal_meta(ctx, "nsic")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "NSIC response", src, method, data))

        if not nsic:
            if rules.is_mandatory(ctx, False):
                return CheckOutput(
                    self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                    summary="NSIC registration required but not provided", confidence=0.4,
                    source=src, method=method, mode=mode, evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="NSIC not claimed", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "result")
        valid_till = rules.first(data, "valid_till", "valid_upto", "expiry")
        as_of = rules.parse_date(getattr(ctx.bid, "submitted_at", None))

        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"NSIC registration inactive (status={status})",
                data={"nsic": nsic, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )
        if rules.is_expired(valid_till, as_of=as_of):
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=f"NSIC registration expired (valid till {valid_till})",
                data={"nsic": nsic, "valid_till": str(valid_till)}, source=src, method=method,
                mode=mode, evidence=evidence,
            )
        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="NSIC portal returned no data", data={"nsic": nsic}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="NSIC registration valid", data={"nsic": nsic, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(NsicCheck())
