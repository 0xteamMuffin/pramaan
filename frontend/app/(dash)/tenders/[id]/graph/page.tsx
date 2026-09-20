"use client";

import { use } from "react";
import { Network } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { EntityGraph } from "@/components/graph/EntityGraph";
import { ErrorState } from "@/components/ui/States";
import { Skeleton } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { getTender, getTenderGraph } from "@/lib/api";

export default function TenderGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tender = useResource(() => getTender(id), [id]);
  const graph = useResource(() => getTenderGraph(id), [id]);

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Tenders", href: "/tenders" },
          { label: tender.data?.ref_no ?? id, href: `/tenders/${id}` },
          { label: "Entity graph" },
        ]}
        title="Entity graph — cartel / related-party view"
        description="Bidders linked by shared PAN, DIN, address, bank or submission IP. Flagged clusters indicate possible related-party or cartel behaviour."
        mode={graph.mode}
      />

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader
            title="Relationship map"
            description="Click any node or edge to inspect why entities are linked. An accessible table is provided below the graph."
            icon={<Network className="h-5 w-5" />}
            className="mb-0"
          />
        </div>
        <div className="px-5 pb-5">
          {graph.loading ? (
            <Skeleton className="h-[460px] w-full" />
          ) : graph.error && !graph.data ? (
            <ErrorState onRetry={graph.refetch} />
          ) : graph.data ? (
            <EntityGraph graph={graph.data} />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
