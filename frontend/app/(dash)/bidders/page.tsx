"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { RagBadge } from "@/components/ui/RagBadge";
import { EmptyState } from "@/components/ui/States";
import { DEMO_TENDERS, DEMO_VERDICTS } from "@/lib/demoData";
import { maskPan } from "@/lib/format";
import { cn } from "@/lib/cn";

const STANCE_LABEL: Record<string, string> = {
  RECOMMEND_QUALIFY: "AI: Qualify",
  FURTHER_SCRUTINY: "AI: Scrutiny",
  RECOMMEND_DISQUALIFY: "AI: Disqualify",
};
const STANCE_STYLE: Record<string, string> = {
  RECOMMEND_QUALIFY: "bg-success-bg text-success",
  FURTHER_SCRUTINY: "bg-warning-bg text-warning",
  RECOMMEND_DISQUALIFY: "bg-danger-bg text-danger",
};

export default function BiddersPage() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    return Object.values(DEMO_VERDICTS)
      .map((v) => ({
        bidderId: v.bidder.id,
        name: v.bidder.legal_name,
        pan: v.bidder.primary_pan,
        constitution: v.bidder.constitution,
        tenderRef: DEMO_TENDERS.find((t) => t.id === v.tender.id)?.ref_no ?? "",
        tenderTitle: v.tender.title,
        score: v.score.score,
        band: v.score.band,
        stance: v.recommendation.stance,
        decided: !!v.decision,
      }))
      .filter((r) => {
        const term = q.trim().toLowerCase();
        if (!term) return true;
        return (
          r.name.toLowerCase().includes(term) ||
          r.pan.toLowerCase().includes(term) ||
          r.tenderRef.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.score - b.score);
  }, [q]);

  return (
    <div>
      <PageHeader
        title="Bidders"
        description="All bidders across active tenders, ranked by risk. Open a bidder for the verdict-first view."
      />

      <div className="mb-4 flex items-center gap-2 rounded-input border border-border bg-surface px-3 sm:max-w-sm">
        <Search aria-hidden className="h-4 w-4 text-ink-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, PAN, tender ref…"
          aria-label="Search bidders"
          className="h-10 w-full bg-transparent text-sm text-ink-900 focus:outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="search" title="No bidders match" description="Try a different search term." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.bidderId} href={`/bidders/${r.bidderId}`} className="no-hl">
              <Card className="h-full transition-shadow hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <Building2 className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-ink-900">{r.name}</p>
                      <p className="text-2xs capitalize text-ink-500">{r.constitution}</p>
                    </div>
                  </div>
                  <span className="tnum text-2xl font-bold text-ink-900">{r.score}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RagBadge band={r.band} size="sm" />
                  <span className={cn("rounded-full px-2 py-0.5 text-2xs font-semibold", STANCE_STYLE[r.stance])}>
                    {STANCE_LABEL[r.stance]}
                  </span>
                  {r.decided && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-medium text-ink-500">
                      decision recorded
                    </span>
                  )}
                </div>
                <div className="mt-3 border-t border-border pt-2.5 text-2xs text-ink-500">
                  <p className="tnum">{maskPan(r.pan)}</p>
                  <p className="truncate">{r.tenderRef} · {r.tenderTitle}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
