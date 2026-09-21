"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileSearch,
  Flag,
  Network,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RagBadge } from "@/components/ui/RagBadge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { getDashboard } from "@/lib/api";
import { cleanText, formatDuration, relativeTime } from "@/lib/format";
import { bandOfScore } from "@/lib/checks";
import { cn } from "@/lib/cn";
import type { AlertItem } from "@/lib/types";

const ALERT_ICON = {
  debarment: ShieldAlert,
  forgery: FileSearch,
  cartel: Network,
  mismatch: AlertTriangle,
  info: Flag,
} as const;

const ALERT_KIND_LABEL: Record<AlertItem["kind"], string> = {
  debarment: "Debarment",
  forgery: "Document forgery",
  cartel: "Cartel signal",
  mismatch: "Cross-portal mismatch",
  info: "Notice",
};

const SEV_ACCENT: Record<AlertItem["severity"], string> = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warning-bg text-warning",
  low: "bg-info-bg text-info",
};

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
        title="Evaluation overview"
        description="Bids currently in evaluation, the signals that need an officer's attention, and verification throughput."
        mode={mode}
      />

      {loading && (
        <div className="grid gap-8 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <Skeleton className="mb-4 h-5 w-48" />
            <SkeletonText lines={5} />
          </Card>
          <Card>
            <Skeleton className="mb-4 h-5 w-32" />
            <SkeletonText lines={5} />
          </Card>
        </div>
      )}

      {error && !data && <ErrorState onRetry={refetch} />}

      {data && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* PRIMARY: attention queue · the officer's real job-to-be-done */}
          <section className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-bg text-danger">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                </span>
                Needs your attention
                <span className="tnum rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold text-white">
                  {data.alerts.length}
                </span>
              </h2>
              <Link
                href="/audit"
                className="text-xs font-medium text-primary hover:underline"
              >
                Full audit trail
              </Link>
            </div>

            {data.alerts.length === 0 ? (
              <EmptyState
                title="Nothing needs attention"
                description="No debarment, forgery, cartel or mismatch signals are open across active tenders."
              />
            ) : (
              <ol className="overflow-hidden rounded-card border border-border bg-surface">
                {data.alerts.map((a) => {
                  const Icon = ALERT_ICON[a.kind];
                  return (
                    <li key={a.id} className="border-b border-border last:border-0">
                      <Link
                        href={alertHref(a)}
                        className="no-hl flex items-start gap-3 px-4 py-3.5 hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            SEV_ACCENT[a.severity],
                          )}
                        >
                          <Icon aria-hidden className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink-900">{cleanText(a.title)}</span>
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-2xs font-semibold",
                                SEV_ACCENT[a.severity],
                              )}
                            >
                              {ALERT_KIND_LABEL[a.kind]}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-sm text-ink-700">{cleanText(a.detail)}</span>
                          <span className="mt-1 block text-2xs text-ink-500">
                            {relativeTime(a.created_at)}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden
                          className="mt-2 h-4 w-4 shrink-0 text-ink-500"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Recent verification runs */}
            <div className="mb-3 mt-8 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-ink-500" aria-hidden />
              <h2 className="text-lg font-semibold text-ink-900">Recent verification runs</h2>
            </div>
            {data.recent_runs.length === 0 ? (
              <EmptyState title="No runs yet" description="Evaluate a tender to populate this list." />
            ) : (
              <ul className="overflow-hidden rounded-card border border-border bg-surface">
                {data.recent_runs.map((run) => {
                  const band = run.band ?? (typeof run.score === "number" ? bandOfScore(run.score) : undefined);
                  return (
                    <li key={run.run_id} className="border-b border-border last:border-0">
                      <Link
                        href={`/bidders/${run.bid_id}`}
                        className="no-hl flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-900">{run.bidder_name}</p>
                          <p className="tnum truncate text-2xs text-ink-500">
                            {run.tender_ref} &middot; {relativeTime(run.finished_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof run.score === "number" && (
                            <span className="tnum text-sm font-semibold text-ink-900">{run.score}</span>
                          )}
                          {band && <RagBadge band={band} size="sm" />}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* SECONDARY: portfolio + throughput, differentiated treatment */}
          <aside className="space-y-6">
            <Card>
              <h2 className="text-sm font-semibold text-ink-900">Portfolio at a glance</h2>
              <div className="mt-4 flex items-center gap-5">
                <ScoreGauge score={data.avg_score} band={bandOfScore(data.avg_score)} size={116} strokeWidth={11} showBand={false} />
                <div>
                  <p className="text-sm text-ink-700">Average compliance score</p>
                  <p className="mt-1 text-2xs text-ink-500">across evaluated bids</p>
                  <Link
                    href="/bidders"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Review all bidders <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-input border border-border bg-border text-center">
                <Stat label="Tenders" value={data.tenders_in_evaluation} href="/tenders" />
                <Stat label="Bidders" value={data.bidders_pending} href="/bidders" />
                <Stat label="Red flags" value={data.red_flags} tone="danger" href="/audit" />
              </dl>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-ink-900">Verification throughput</h2>
              </div>
              <p className="mt-2 text-sm text-ink-700">
                Manual multi-portal due diligence takes about{" "}
                <span className="font-semibold text-ink-900">
                  {(data.time_savings.manual_minutes_per_bidder / 60).toFixed(1)} hours
                </span>{" "}
                per bidder. PRAMAAN completes a full run in about{" "}
                <span className="font-semibold text-ink-900">
                  {formatDuration(data.time_savings.pramaan_seconds_per_bidder)}
                </span>
                .
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <TimeBar
                  label="Manual"
                  valueLabel={`${(data.time_savings.manual_minutes_per_bidder / 60).toFixed(1)} hr`}
                  fraction={1}
                  tone="track"
                />
                <TimeBar
                  label="PRAMAAN"
                  valueLabel={formatDuration(data.time_savings.pramaan_seconds_per_bidder)}
                  fraction={Math.max(
                    0.06,
                    data.time_savings.pramaan_seconds_per_bidder /
                      (data.time_savings.manual_minutes_per_bidder * 60),
                  )}
                  tone="accent"
                />
                <div className="flex-1 border-l border-border pl-4">
                  <p className="tnum text-2xl font-bold text-ink-900">
                    {Math.round(data.time_savings.hours_saved)}
                    <span className="ml-1 text-sm font-medium text-ink-500">hr</span>
                  </p>
                  <p className="text-2xs text-ink-500">
                    saved over {data.time_savings.bidders_processed} bidders
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "danger";
}) {
  return (
    <Link href={href} className="no-hl bg-surface px-2 py-3 hover:bg-surface-2">
      <dd
        className={cn(
          "tnum text-2xl font-bold leading-none",
          tone === "danger" && value > 0 ? "text-danger" : "text-ink-900",
        )}
      >
        {value}
      </dd>
      <dt className="mt-1 text-2xs font-medium text-ink-500">{label}</dt>
    </Link>
  );
}

function TimeBar({
  label,
  valueLabel,
  fraction,
  tone,
}: {
  label: string;
  valueLabel: string;
  fraction: number;
  tone: "track" | "accent";
}) {
  return (
    <div className="flex w-16 flex-col items-center">
      <span className="mb-1 text-2xs font-semibold text-ink-700">{valueLabel}</span>
      <div className="flex h-20 w-8 items-end overflow-hidden rounded-t bg-surface-2">
        <div
          className={cn("w-full rounded-t transition-all", tone === "accent" ? "bg-secondary" : "bg-primary/70")}
          style={{ height: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      <span className="mt-1 text-2xs text-ink-500">{label}</span>
    </div>
  );
}
