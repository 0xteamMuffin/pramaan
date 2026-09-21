"use client";

import { useMemo, useState } from "react";
import { Download, Link2, ScrollText, ShieldCheck, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { getAudit, verifyAudit } from "@/lib/api";
import { formatDateTime, truncateHash } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AuditIntegrity } from "@/lib/types";

const ACTION_TONE = (action: string): string => {
  if (action.includes("fail") || action.includes("debarment") || action.includes("cartel")) return "bg-danger";
  if (action.includes("decision")) return "bg-primary";
  if (action.includes("completed") || action.includes("loaded")) return "bg-success";
  if (action.includes("changed") || action.includes("exported")) return "bg-secondary";
  return "bg-info";
};

export default function AuditPage() {
  const { data, loading, error, mode, refetch } = useResource(getAudit, []);
  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");
  const [integrity, setIntegrity] = useState<AuditIntegrity | null>(null);
  const [verifying, setVerifying] = useState(false);

  const filtered = useMemo(() => {
    return (data ?? [])
      .filter((e) => (actor ? e.actor.toLowerCase().includes(actor.toLowerCase()) : true))
      .filter((e) => (target ? e.target.toLowerCase().includes(target.toLowerCase()) : true))
      .slice()
      .sort((a, b) => b.seq - a.seq);
  }, [data, actor, target]);

  const runVerify = async () => {
    setVerifying(true);
    const res = await verifyAudit();
    setIntegrity(res.data);
    setVerifying(false);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data ?? [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pramaan-audit-log.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Append-only, hash-chained record of every mutation. Tamper-evident · each event's hash includes the previous event's hash."
        mode={mode}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={runVerify} loading={verifying}>
              <ShieldCheck className="h-4 w-4" /> Verify integrity
            </Button>
            <Button variant="secondary" size="sm" onClick={exportJson}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {integrity && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-input border px-3 py-2.5 text-sm font-medium",
            integrity.intact
              ? "border-success/30 bg-success-bg text-success"
              : "border-danger/30 bg-danger-bg text-danger",
          )}
        >
          {integrity.intact ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
          {integrity.intact
            ? `Chain intact · ${integrity.count} events verified end-to-end.`
            : `Chain BROKEN at sequence ${integrity.broken_at_seq}. Tampering detected.`}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Filter by actor…"
          aria-label="Filter by actor"
          className="h-9 rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Filter by target…"
          aria-label="Filter by target"
          className="h-9 rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
        />
      </div>

      <Card padded={false}>
        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={6} cols={3} />
          </div>
        ) : error && !data ? (
          <div className="p-5">
            <ErrorState onRetry={refetch} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState icon="search" title="No matching audit events" description="Adjust your filters above." />
          </div>
        ) : (
          <ol className="p-5">
            {filtered.map((e, i) => (
              <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* rail */}
                {i < filtered.length - 1 && (
                  <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden />
                )}
                <span className={cn("mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-surface", ACTION_TONE(e.action))} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tnum rounded bg-surface-2 px-1.5 py-0.5 text-2xs font-semibold text-ink-700">
                      #{e.seq}
                    </span>
                    <span className="font-mono text-sm font-semibold text-ink-900">{e.action}</span>
                    <span className="text-2xs text-ink-500">on</span>
                    <span className="tnum text-2xs font-medium text-ink-700">{e.target}</span>
                  </div>
                  <p className="mt-0.5 text-2xs text-ink-500">
                    {e.actor} · {formatDateTime(e.created_at)}
                  </p>
                  {Object.keys(e.payload).length > 0 && (
                    <p className="tnum mt-1 rounded bg-surface-1 px-2 py-1 text-2xs text-ink-700">
                      {JSON.stringify(e.payload)}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-2xs text-ink-500">
                    <Link2 className="h-3 w-3" aria-hidden />
                    <span className="tnum">hash {truncateHash(e.hash)}</span>
                    <span aria-hidden>·</span>
                    <span className="tnum">prev {truncateHash(e.prev_hash)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
