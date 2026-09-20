"""OEM authorization / MAF check (ELIGIBILITY).

A fake, expired, or brand-mismatched Manufacturer Authorization Form (MAF) for
the quoted brand is a hard veto (docs/03-architecture/compliance-engine.md §3).
Also consumes forensic findings so a tampered MAF fails here as well as in
document-integrity.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


def _find_maf(ctx: CheckContext):
    for doc in ctx.documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if "maf" in dt or "oem" in dt or "authoriz" in dt or "authoris" in dt:
            return doc
    return None


class OemCheck(Check):
    key = "oem"
    dimension = Dimension.ELIGIBILITY.value

    def applies(self, ctx: CheckContext) -> bool:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        return (
            ctx.requirement is not None
            or bool(rules.first(flags, "oem", "quoted_brand", "brand"))
            or _find_maf(ctx) is not None
        )

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        flags = dict(getattr(ctx.bidder, "claimed_flags", None) or {})
        quoted_brand = rules.first(flags, "quoted_brand", "brand") or rules.param(ctx, "brand")
        maf = _find_maf(ctx)
        forgery_map = ctx.ai.get("forgery") or ctx.extras.get("forgery") or {}
        data = rules.portal_data(ctx, "oem")
        src, method, mode = rules.portal_meta(ctx, "oem")

        evidence: list[EvidenceItem] = []
        if data:
            evidence.append(EvidenceItem("portal_response", "GeM OEM panel response", src, method, data))

        if maf is None:
            # No MAF at all — if required, needs manual verification (not a silent pass)
            if rules.is_mandatory(ctx, False):
                return CheckOutput(
                    self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                    summary="OEM authorization required but no MAF document found", confidence=0.4,
                    data={"quoted_brand": quoted_brand}, source=src, method=method, mode=mode,
                    evidence=evidence,
                )
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="No OEM/MAF required or provided", mode=mode, evidence=evidence,
            )

        extracted = dict(getattr(maf, "extracted", None) or {})
        maf_id = getattr(maf, "id", None)
        evidence.append(
            EvidenceItem("document_field", "MAF document fields", "document", "extraction", extracted, document_id=maf_id)
        )

        # 1) forged MAF -> veto
        forensic = forgery_map.get(maf_id) if isinstance(forgery_map, dict) else None
        if forensic and forensic.get("verdict") == "tampered":
            evidence.append(
                EvidenceItem("forensic", "MAF forensic verdict: tampered", "forensics",
                             forensic.get("method"), forensic, document_id=maf_id)
            )
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary="OEM MAF is forged/tampered (forensics)", is_veto=True, confidence=0.9,
                data={"quoted_brand": quoted_brand, "forensic": forensic},
                source="forensics", method=forensic.get("method"), mode=mode, evidence=evidence,
            )

        # 2) expired MAF -> veto
        as_of = rules.parse_date(getattr(ctx.bid, "submitted_at", None))
        valid_till = rules.first(extracted, "valid_till", "valid_upto", "expiry", "expiry_date")
        if rules.is_expired(valid_till, as_of=as_of):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"OEM MAF expired (valid till {valid_till})", is_veto=True,
                data={"valid_till": str(valid_till), "quoted_brand": quoted_brand},
                source="document", method="extraction", mode=mode, evidence=evidence,
            )

        # 3) brand mismatch -> veto
        maf_brand = rules.first(extracted, "brand", "oem", "manufacturer", "make")
        if quoted_brand and maf_brand and not rules.names_match(str(maf_brand), str(quoted_brand), threshold=80):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"MAF brand '{maf_brand}' does not match quoted brand '{quoted_brand}'",
                is_veto=True, data={"maf_brand": maf_brand, "quoted_brand": quoted_brand},
                source="document", method="extraction", mode=mode, evidence=evidence,
            )

        # 4) portal contradiction
        status = rules.first(data, "status", "authorization_status", "result")
        if data and rules.status_is_inactive(status):
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"OEM authorization not active on GeM panel (status={status})", is_veto=True,
                data={"status": status, "quoted_brand": quoted_brand},
                source=src, method=method, mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"OEM MAF present and valid for '{maf_brand or quoted_brand or 'brand'}'",
            data={"maf_brand": maf_brand, "quoted_brand": quoted_brand, "valid_till": str(valid_till) if valid_till else None},
            source=src or "document", method=method or "extraction", mode=mode, evidence=evidence,
        )


register(OemCheck())
