"""DigiLocker provenance check (DOCUMENT).

Contrasts DigiLocker-issued/signed documents (tamper-proof at source) with plain
self-uploaded PDFs. Signed documents earn a PASS; an all-uploaded set is a
WARN only when the tender prefers/requires DigiLocker.
"""
from __future__ import annotations

from app.compliance import rules
from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class DigiLockerCheck(Check):
    key = "digilocker"
    dimension = Dimension.DOCUMENT.value

    def applies(self, ctx: CheckContext) -> bool:
        return bool(ctx.documents) or ctx.requirement is not None

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        docs = ctx.documents or []
        signed = [d for d in docs if str(getattr(d, "source", "")).lower() == "digilocker"]
        uploaded = [d for d in docs if str(getattr(d, "source", "")).lower() != "digilocker"]
        data = rules.portal_data(ctx, "digilocker")
        src, method, mode = rules.portal_meta(ctx, "digilocker")

        evidence = [
            EvidenceItem(
                "rule", "Document provenance breakdown", "documents", "source-check",
                {"digilocker_count": len(signed), "uploaded_count": len(uploaded)},
            )
        ]
        if data:
            evidence.append(EvidenceItem("portal_response", "DigiLocker response", src, method, data))

        if not docs:
            return CheckOutput(
                self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
                summary="No documents to assess for provenance", mode=mode, evidence=evidence,
            )

        if signed:
            return CheckOutput(
                self.key, self.dimension, Verdict.PASS.value,
                summary=f"{len(signed)} DigiLocker-verified document(s) present",
                data={"digilocker_count": len(signed), "uploaded_count": len(uploaded)},
                source=src or "documents", method=method or "source-check", mode=mode, evidence=evidence,
            )

        if rules.is_mandatory(ctx, False):
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary="No DigiLocker-verified documents; all self-uploaded (prefer DigiLocker)",
                data={"uploaded_count": len(uploaded)}, source="documents", method="source-check",
                mode=mode, evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.NOT_APPLICABLE.value,
            summary="All documents self-uploaded; DigiLocker not required",
            data={"uploaded_count": len(uploaded)}, mode=mode, evidence=evidence,
        )


register(DigiLockerCheck())
