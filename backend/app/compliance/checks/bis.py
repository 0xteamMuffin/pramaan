"""BIS certification check (ELIGIBILITY).

Validates BIS ISI/CRS licence format and confirms the licence actually belongs to
the bidder / quoted brand. A licence registered to a different firm/brand is a
FAIL (planted fraud: B3 quotes a BIS number belonging to another brand).
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


def _bis_value(ctx: CheckContext) -> str | None:
    val = ctx.identifiers.get("bis")
    if val:
        return val
    for doc in ctx.documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if "bis" in dt or "isi" in dt or "crs" in dt:
            v = rules.first(dict(getattr(doc, "extracted", None) or {}), "bis", "licence", "license", "crs")
            if v:
                return str(v)
    return None


class BisCheck(Check):
    key = "bis"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return ctx.requirement is not None or _bis_value(ctx) is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        bis = _bis_value(ctx)
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        quoted_brand = rules.first(flags, "quoted_brand", "brand")
        bidder_name = getattr(ctx.bidder, "legal_name", None)
        data = rules.portal_data(ctx, "bis")
        src, method, mode = rules.portal_meta(ctx, "bis")
        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "BIS response", src, method, data))

        if not bis:
            if rules.is_mandatory(ctx):
                return CheckOutput(
                    self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                    summary="BIS certification required but no licence provided", confidence=0.4,
                    source=src, method=method, mode=mode, evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="BIS not required or provided", mode=mode, evidence=evidence,
            )

        if not rules.validate_bis(bis):
            evidence.append(EvidenceItem("rule", "BIS format check failed", "regex", "BIS", {"bis": bis}))
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"BIS licence '{bis}' fails ISI/CRS format", data={"bis": bis},
                source="regex", method="BIS", mode=mode, evidence=evidence,
            )

        status = rules.first(data, "status", "licence_status", "result")
        holder = rules.first(data, "license_holder", "licence_holder", "firm", "firm_name", "brand", "manufacturer")

        # Licence registered to a different firm/brand -> mismatch fraud
        if holder:
            match_brand = quoted_brand and rules.names_match(str(holder), str(quoted_brand), threshold=80)
            match_bidder = bidder_name and rules.names_match(str(holder), str(bidder_name), threshold=80)
            if not (match_brand or match_bidder):
                evidence.append(
                    EvidenceItem(
                        "rule", "BIS licence holder mismatch", "rule", "brand-match",
                        {"licence_holder": holder, "quoted_brand": quoted_brand, "bidder": bidder_name},
                    )
                )
                return CheckOutput(
                    self.key, self.dimension, Verdict.FAIL.value,
                    summary=f"BIS licence belongs to '{holder}', not the bidder/quoted brand",
                    data={"bis": bis, "licence_holder": holder, "quoted_brand": quoted_brand},
                    source=src, method=method, mode=mode, evidence=evidence,
                )

        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"BIS licence inactive/expired (status={status})",
                data={"bis": bis, "status": status}, source=src, method=method, mode=mode,
                evidence=evidence,
            )

        if not data:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="BIS portal returned no data", data={"bis": bis}, confidence=0.5,
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"BIS licence valid ({holder})" if holder else "BIS licence valid",
            data={"bis": bis, "licence_holder": holder, "status": status},
            source=src, method=method, mode=mode, evidence=evidence,
        )


register(BisCheck())
