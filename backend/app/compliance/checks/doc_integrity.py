"""Document-integrity / forgery check (DOCUMENT, veto-capable).

Aggregates the per-document forensic verdicts produced by ai/forgery.py. Any
`tampered` document is a hard veto (planted cases: B3 forged MAF, B4 spliced GST).
`suspect` documents downgrade to WARN.
Spec: docs/03-architecture/compliance-engine.md §3.
"""
from __future__ import annotations

from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class DocIntegrityCheck(Check):
    key = "doc_integrity"
    dimension = Dimension.DOCUMENT.value

    def applies(self, ctx: CheckContext) -> bool:
        return True

    def _forgery_map(self, ctx: CheckContext) -> dict:
        fm = ctx.ai.get("forgery")
        if not fm:
            fm = ctx.extras.get("forgery")
        return fm or {}

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        forgery_map = self._forgery_map(ctx)
        docs = ctx.documents or []

        tampered: list[dict] = []
        suspect: list[dict] = []
        clean = 0
        evidence: list[EvidenceItem] = []

        by_id = {getattr(d, "id", None): d for d in docs}
        for doc_id, result in forgery_map.items():
            verdict = str((result or {}).get("verdict", "")).lower()
            doc = by_id.get(doc_id)
            doc_type = getattr(doc, "doc_type", None) if doc else (result or {}).get("doc_type")
            entry = {
                "document_id": doc_id,
                "doc_type": doc_type,
                "verdict": verdict,
                "score": (result or {}).get("score"),
                "findings": (result or {}).get("findings"),
            }
            if verdict == "tampered":
                tampered.append(entry)
                evidence.append(
                    EvidenceItem("forensic", f"Tampered document: {doc_type}", "forensics",
                                 (result or {}).get("method"), result, document_id=doc_id)
                )
            elif verdict == "suspect":
                suspect.append(entry)
                evidence.append(
                    EvidenceItem("forensic", f"Suspect document: {doc_type}", "forensics",
                                 (result or {}).get("method"), result, document_id=doc_id)
                )
            elif verdict == "clean":
                clean += 1

        if not forgery_map:
            return CheckOutput(
                self.key, self.dimension, Verdict.UNVERIFIABLE.value,
                summary="No forensic analysis available for documents", confidence=0.4,
                mode="SIMULATED", evidence=evidence,
            )

        if tampered:
            types = ", ".join(str(t["doc_type"]) for t in tampered)
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=f"Document forgery detected ({len(tampered)}): {types}",
                is_veto=True, confidence=0.9, data={"tampered": tampered, "suspect": suspect},
                source="forensics", method="layered", mode="SIMULATED", evidence=evidence,
            )

        if suspect:
            types = ", ".join(str(s["doc_type"]) for s in suspect)
            return CheckOutput(
                self.key, self.dimension, Verdict.WARN.value,
                summary=f"Suspect document(s) need manual review ({len(suspect)}): {types}",
                confidence=0.7, data={"suspect": suspect}, source="forensics", method="layered",
                mode="SIMULATED", evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary=f"All {clean} analyzed document(s) passed integrity checks",
            data={"clean": clean}, source="forensics", method="layered", mode="SIMULATED",
            evidence=evidence,
        )


register(DocIntegrityCheck())
