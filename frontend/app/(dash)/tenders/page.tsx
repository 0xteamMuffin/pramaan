"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus2, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SortHeader } from "@/components/ui/SortHeader";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { listTenders } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Tender, TenderStatus } from "@/lib/types";

const STATUS_STYLE: Record<TenderStatus, string> = {
  draft: "bg-surface-2 text-ink-700",
  open: "bg-info-bg text-info",
  evaluating: "bg-secondary-50 text-secondary-dark",
  awarded: "bg-success-bg text-success",
  closed: "bg-surface-2 text-ink-500",
};

type SortKey = "ref_no" | "estimated_value" | "bidder_count" | "high_risk_count";

export default function TendersPage() {
  const { data, loading, error, mode, refetch } = useResource(listTenders, []);
  const [statusFilter, setStatusFilter] = useState<TenderStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("estimated_value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    let list = (data ?? []).slice();
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [data, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const statuses: (TenderStatus | "all")[] = ["all", "evaluating", "open", "awarded", "closed", "draft"];

  return (
    <div>
      <PageHeader
        title="Tenders"
        description="GeM tenders under evaluation. Open a tender to compare bidders side-by-side."
        mode={mode}
        actions={
          <Button variant="accent" size="sm">
            <FilePlus2 className="h-4 w-4" /> New tender
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <Filter className="h-3.5 w-3.5" /> Status
        </span>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              statusFilter === s
                ? "border-primary bg-primary-50 text-primary"
                : "border-border bg-surface text-ink-700 hover:bg-surface-2",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={4} cols={6} />
          </div>
        ) : error && !data ? (
          <div className="p-5">
            <ErrorState onRetry={refetch} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No tenders match this filter"
              description="Try a different status or create a new tender from a template."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="sticky top-0 z-10 bg-surface-1">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Ref / Title" active={sortKey === "ref_no"} direction={sortDir} onSort={() => toggleSort("ref_no")} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Buyer</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader label="Value" active={sortKey === "estimated_value"} direction={sortDir} onSort={() => toggleSort("estimated_value")} align="right" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-2xs font-semibold uppercase tracking-wide text-ink-500">Status</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader label="Bidders" active={sortKey === "bidder_count"} direction={sortDir} onSort={() => toggleSort("bidder_count")} align="right" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader label="High-risk" active={sortKey === "high_risk_count"} direction={sortDir} onSort={() => toggleSort("high_risk_count")} align="right" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t: Tender, i) => (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-surface-2",
                      i % 2 === 1 && "bg-surface-1/60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/tenders/${t.id}`} className="no-hl block">
                        <span className="tnum block text-2xs text-ink-500">{t.ref_no}</span>
                        <span className="block font-medium text-primary hover:underline">{t.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{t.buyer_org}</td>
                    <td className="tnum px-4 py-3 text-right font-medium text-ink-900">
                      {formatINR(t.estimated_value, { compact: true })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-2xs font-semibold capitalize",
                          STATUS_STYLE[t.status],
                        )}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink-900">{t.bidder_count}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "tnum inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-2xs font-bold",
                          t.high_risk_count > 0 ? "bg-danger-bg text-danger" : "bg-success-bg text-success",
                        )}
                      >
                        {t.high_risk_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
