"""Cartel / related-party check (INTEGRITY, veto-capable).

Reads the tender entity-graph clusters (built by ai/graph.py). If this bidder
belongs to a cluster of "competing" bidders sharing a director DIN, bank account,
or submission IP, it is a hard veto (planted case: B6/B7).
Spec: docs/03-architecture/ai-verification-engine.md §3.
"""
from __future__ import annotations

from app.compliance.base import Check, CheckContext, CheckOutput, EvidenceItem, register
from app.models.enums import Dimension, Verdict


class CartelCheck(Check):
    key = "cartel"
    dimension = Dimension.INTEGRITY.value

    def applies(self, ctx: CheckContext) -> bool:
        return True  # graph screening is always-on

    def evaluate(self, ctx: CheckContext) -> CheckOutput:
        graph = ctx.ai.get("graph") or {}
        clusters = graph.get("clusters") or []
        bidder_id = getattr(ctx.bidder, "id", None)

        my_clusters = [c for c in clusters if bidder_id in (c.get("bidder_ids") or [])]

        if my_clusters:
            cluster = max(my_clusters, key=lambda c: len(c.get("bidder_ids") or []))
            co_bidders = [b for b in cluster.get("bidder_ids", []) if b != bidder_id]
            evidence = [
                EvidenceItem(
                    "graph", f"Collusion cluster ({cluster.get('reason')})", "entity-graph",
                    "cluster-detection",
                    {
                        "bidder_ids": cluster.get("bidder_ids"),
                        "shared": cluster.get("shared"),
                        "severity": cluster.get("severity"),
                    },
                )
            ]
            return CheckOutput(
                self.key, self.dimension, Verdict.FAIL.value,
                summary=(
                    f"Cartel/related-party signal: {cluster.get('reason')} with "
                    f"{len(co_bidders)} other bidder(s)"
                ),
                is_veto=True, confidence=0.85,
                data={"cluster": cluster, "co_bidders": co_bidders},
                source="entity-graph", method="cluster-detection", mode="SIMULATED", evidence=evidence,
            )

        return CheckOutput(
            self.key, self.dimension, Verdict.PASS.value,
            summary="No cartel/related-party links detected across tender bidders",
            source="entity-graph", method="cluster-detection", mode="SIMULATED",
        )


register(CartelCheck())
