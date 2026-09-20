"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  FileSearch,
  Flag,
  Gauge,
  Network,
  ShieldAlert,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { RagBadge } from "@/components/ui/RagBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import { Sparkline } from "@/components/ui/Sparkline";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { getDashboard, bidIdForBidder } from "@/lib/api";
import { formatDuration, formatNumber, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AlertItem } from "@/lib/types";

const ALERT_ICON = {
  debarment: ShieldAlert,
  forgery: FileSearch,
  cartel: Network,
  mismatch: AlertTriangle,
  info: Flag,
} as const;

const ALERT_TONE = {
  high: "border-danger/30 bg-danger-bg text-danger",
  medium: "border-warning/30 bg-warning-bg text-warning",
  low: "border-info/30 bg-info-bg text-info",
} as const;

function alertHref(a: AlertItem): string {
  if (a.bidder_id) return `/bidders/${a.bidder_id}`;
  if (a.tender_id) return `/tenders/${a.tender_id}`;
  return "/dashboard";
}

export default function DashboardPage() {
  const { data, loading, error, mode, refetch } = useResource(getDashboard, []);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Live picture of tenders in evaluation, risk signals and the time PRAMAAN is saving your team."
        mode={mode}
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && !data && <ErrorState onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Tenders in evaluation"
              value={data.tenders_in_evaluation}
              icon={<FileSearch className="h-5 w-5" />}
              tone="primary"
              footer={<Link href="/tenders" className="text-primary hover:underline">View all tenders →</Link>}
            />
            <KpiCard
              label="Bidders pending decision"
              value={data.bidders_pending}
              icon={<Users className="h-5 w-5" />}
              tone="teal"
              footer={<Link href="/bidders" className="text-primary hover:underline">Review bidders →</Link>}
            />
            <KpiCard
              label="Avg compliance score"
              value={data.avg_score}
              sublabel="across evaluated bids"
              icon={<Gauge className="h-5 w-5" />}
              tone="success"
              footer={
                <span className="flex items-center gap-2">
                  <Sparkline values={[62, 48, 55, 40, 58, data.avg_score]} />
                  <span className="text-2xs">6-run trend</span>
                </span>
              }
            />
            <KpiCard
              label="Red flags"
              value={data.red_flags}
              sublabel="high-risk bids / vetoes"
              icon={<Flag className="h-5 w-5" />}
              tone="danger"
              footer={<Link href="/audit" className="text-primary hover:underline">Open audit trail →</Link>}
            />
          </div>

          {/* Time savings highlight */}
          <Card className="overflow-hidden bg-primary-dark text-white">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-secondary">
                  <Timer className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-semibold uppercase tracking-wide">Time saved</span>
                </div>
                <p className="mt-2 max-w-md text-sm text-white/70">
                  Manual due-diligence takes roughly {Math.round(data.time_savings.manual_minutes_per_bidder / 60)}–4
                  hours per bidder. PRAMAAN completes a full verification run in about{" "}
                  {formatDuration(data.time_savings.pramaan_seconds_per_bidder)}.
                </p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xs uppercase tracking-wide text-white/60">Manual</p>
                  <p className="tnum text-2xl font-bold">
                    {(data.time_savings.manual_minutes_per_bidder / 60).toFixed(1)} hr
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 rotate-180 text-secondary" aria-hidden />
                <div className="text-center">
                  <p className="text-2xs uppercase tracking-wide text-white/60">PRAMAAN</p>
                  <p className="tnum text-2xl font-bold text-secondary">
                    {formatDuration(data.time_savings.pramaan_seconds_per_bidder)}
                  </p>
                </div>
                <div className="border-l border-white/20 pl-8 text-center">
                  <p className="text-2xs uppercase tracking-wide text-white/60">Est. hours saved</p>
                  <p className="tnum text-3xl font-bold text-white">
                    {formatNumber(data.time_savings.hours_saved)}
                  </p>
                  <p className="text-2xs text-white/60">
                    over {data.time_savings.bidders_processed} bidders
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Recent runs */}
            <Card className="lg:col-span-3" padded={false}>
              <div className="p-5 pb-3">
                <CardHeader
                  title="Recent verification runs"
                  description="Most recent bids processed by the engine."
                  icon={<Clock3 className="h-5 w-5" />}
                  className="mb-0"
                />
              </div>
              {data.recent_runs.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No runs yet" description="Evaluate a tender to see runs here." />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent_runs.map((run) => (
                    <li key={run.run_id}>
                      <Link
                        href={`/bidders/${run.bid_id.replace("bid-", "")}`}
                        className="no-hl flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{run.bidder_name}</p>
                          <p className="truncate text-2xs text-ink-500">
                            {run.tender_ref} · {relativeTime(run.finished_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof run.score === "number" && (
                            <span className="tnum text-sm font-semibold text-ink-900">{run.score}</span>
                          )}
                          {run.band && <RagBadge band={run.band} size="sm" />}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Alerts */}
            <Card className="lg:col-span-2" padded={false}>
              <div className="p-5 pb-3">
                <CardHeader
                  title="Alerts"
                  description="New debarment, forgery, cartel and mismatch signals."
                  icon={<AlertTriangle className="h-5 w-5" />}
                  className="mb-0"
                />
              </div>
              <ul className="divide-y divide-border">
                {data.alerts.map((a) => {
                  const Icon = ALERT_ICON[a.kind];
                  return (
                    <li key={a.id}>
                      <Link
                        href={alertHref(a)}
                        className="no-hl flex items-start gap-3 px-5 py-3 hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                            ALERT_TONE[a.severity],
                          )}
                        >
                          <Icon aria-hidden className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-ink-900">{a.title}</span>
                            <StatusChip
                              verdict={a.severity === "high" ? "FAIL" : a.severity === "medium" ? "WARN" : "UNVERIFIABLE"}
                              size="sm"
                              label={a.severity.toUpperCase()}
                            />
                          </span>
                          <span className="mt-0.5 block text-2xs text-ink-500">{a.detail}</span>
                          <span className="mt-0.5 block text-2xs text-ink-500">{relativeTime(a.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
