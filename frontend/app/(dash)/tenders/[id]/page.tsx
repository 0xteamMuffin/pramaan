"use client";

import { use, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Network, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { RagBadge } from "@/components/ui/RagBadge";
import { ErrorState } from "@/components/ui/States";
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { evaluateAll, getComparison, getTender } from "@/lib/api";
import { checkShort } from "@/lib/checks";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Verdict } from "@/lib/types";

const COMPACT_LABEL: Record<Verdict, string> = {
  PASS: "Pass",
  WARN: "Warn",
  FAIL: "Fail",
  UNVERIFIABLE: "Unv.",
  NOT_APPLICABLE: "N/A",
};

const STANCE_STYLE: Record<string, string> = {
  RECOMMEND_QUALIFY: "bg-success-bg text-success",
  FURTHER_SCRUTINY: "bg-warning-bg text-warning",
  RECOMMEND_DISQUALIFY: "bg-danger-bg text-danger",
};
const STANCE_LABEL: Record<string, string> = {
  RECOMMEND_QUALIFY: "Qualify",
  FURTHER_SCRUTINY: "Scrutiny",
  RECOMMEND_DISQUALIFY: "Disqualify",
};

export default function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tender = useResource(() => getTender(id), [id]);
  const matrix = useResource(() => getComparison(id), [id]);
  const [evalMsg, setEvalMsg] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluate = async () => {
    setEvaluating(true);
    setEvalMsg(null);
    const res = await evaluateAll(id);
    setEvaluating(false);
    setEvalMsg(
      `${res.data.queued} bid(s) queued for verification${res.mode === "demo" ? " (demo)" : ""}. Results below reflect the latest run.`,
    );
    matrix.refetch();
  };

  const t = tender.data;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Tenders", href: "/tenders" }, { label: t?.ref_no ?? id }]}
        title={t?.title ?? (tender.loading ? "Loading tender…" : "Tender")}
        description={t ? `${t.buyer_org}` : undefined}
        mode={tender.mode}
        actions={
          <>
            <Button variant="accent" size="sm" onClick={handleEvaluate} loading={evaluating}>
              <PlayCircle className="h-4 w-4" /> Evaluate all
            </Button>
            <Link href={`/tenders/${id}/graph`}>
              <Button variant="secondary" size="sm">
                <Network className="h-4 w-4" /> Entity graph
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Export summary
            </Button>
          </>
        }
      />

      {/* Tender meta + rules */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Tender details" />
          {tender.loading ? (
            <SkeletonRows rows={2} cols={4} />
          ) : tender.error && !t ? (
            <ErrorState onRetry={tender.refetch} />
          ) : t ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Meta label="Reference" value={<span className="tnum">{t.ref_no}</span>} />
              <Meta label="Category" value={<span className="capitalize">{t.category}</span>} />
              <Meta label="Estimated value" value={<span className="tnum">{formatINR(t.estimated_value, { compact: true })}</span>} />
              <Meta label="Status" value={<span className="capitalize">{t.status}</span>} />
              <Meta label="Bidders" value={<span className="tnum">{t.bidder_count}</span>} />
              <Meta
                label="High-risk"
                value={<span className={cn("tnum font-bold", t.high_risk_count > 0 ? "text-danger" : "text-success")}>{t.high_risk_count}</span>}
              />
            </dl>
          ) : null}
        </Card>
        <Card>
          <CardHeader title="Rule summary" description="Mandatory eligibility for this tender." />
          {t?.rule_summary ? (
            <ul className="space-y-2">
              {t.rule_summary.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </Card>
      </div>

      {evalMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-input border border-info/30 bg-info-bg px-3 py-2 text-sm text-info">
          <PlayCircle className="h-4 w-4" aria-hidden /> {evalMsg}
        </div>
      )}

      {/* Comparison matrix */}
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
          <CardHeader
            title="Bidder comparison matrix"
            description="Rows = bidders · columns = checks · last column = score & risk band. Sorted by score."
            className="mb-0"
          />
          <MatrixLegend />
        </div>

        {matrix.loading ? (
          <div className="p-5">
            <SkeletonRows rows={4} cols={8} />
          </div>
        ) : matrix.error && !matrix.data ? (
          <div className="p-5">
            <ErrorState onRetry={matrix.refetch} />
          </div>
        ) : matrix.data ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 border-b border-border bg-surface-1 px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    Bidder
                  </th>
                  {matrix.data.check_keys.map((k) => (
                    <th
                      key={k}
                      className="border-b border-border bg-surface-1 px-2 py-3 text-center text-2xs font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {checkShort(k)}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 border-b border-l border-border bg-surface-1 px-4 py-3 text-right text-2xs font-semibold uppercase tracking-wide text-ink-500">
                    Score · Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.data.rows.map((row, i) => (
                  <tr key={row.bid_id} className={cn(i % 2 === 1 && "bg-surface-1/50")}>
                    <td className="sticky left-0 z-10 border-b border-border bg-inherit px-4 py-3">
                      <Link
                        href={`/bidders/${row.bidder_id}`}
                        className="no-hl block font-medium text-primary hover:underline"
                      >
                        {row.bidder_name}
                      </Link>
                      <span
                        className={cn(
                          "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-2xs font-semibold",
                          STANCE_STYLE[row.recommendation],
                        )}
                      >
                        AI: {STANCE_LABEL[row.recommendation]}
                      </span>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.key} className="border-b border-border px-2 py-3 text-center">
                        <span className="flex justify-center" title={`${checkShort(cell.key)}: ${COMPACT_LABEL[cell.verdict]}`}>
                          <StatusChip
                            verdict={cell.verdict}
                            isVeto={cell.is_veto}
                            size="sm"
                            label={COMPACT_LABEL[cell.verdict]}
                          />
                        </span>
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 border-b border-l border-border bg-inherit px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tnum text-base font-bold text-ink-900">{row.score}</span>
                        <RagBadge band={row.band} size="sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function MatrixLegend() {
  const items: Verdict[] = ["PASS", "WARN", "FAIL", "UNVERIFIABLE", "NOT_APPLICABLE"];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((v) => (
        <StatusChip key={v} verdict={v} size="sm" label={COMPACT_LABEL[v]} />
      ))}
    </div>
  );
}
