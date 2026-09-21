"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RagBadge } from "@/components/ui/RagBadge";
import { EmptyState } from "@/components/ui/States";
import { DEMO_TENDERS, DEMO_VERDICTS } from "@/lib/demoData";
import { reportUrl } from "@/lib/api";
import { formatDate, truncateHash } from "@/lib/format";

const REPORT_CONTENTS = [
  "Bidder & tender identity",
  "All 13+ checks with verdicts",
  "Evidence provenance per check",
  "Score breakdown & vetoes",
  "AI recommendation (advisory)",
  "Officer decision & audit hash",
];

export default function ReportsPage() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    return Object.values(DEMO_VERDICTS)
      .map((v) => ({
        bidId: v.bid.id,
        bidderId: v.bidder.id,
        name: v.bidder.legal_name,
        tenderRef: DEMO_TENDERS.find((t) => t.id === v.tender.id)?.ref_no ?? "",
        tenderTitle: v.tender.title,
        band: v.score.band,
        score: v.score.score,
        decided: v.decision?.outcome,
        decidedAt: v.decision?.decided_at,
        hash: `sha256:${v.run.run_id}`,
      }))
      .filter((r) => {
        const term = q.trim().toLowerCase();
        return !term || r.name.toLowerCase().includes(term) || r.tenderRef.toLowerCase().includes(term);
      })
      .sort((a, b) => a.score - b.score);
  }, [q]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate a per-bid audit report (PDF) with every check, verdict, evidence provenance, the AI recommendation and the officer's decision."
      />

      <Card className="mb-6 bg-primary-50">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-ink-900">Each PDF report includes</p>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
            {REPORT_CONTENTS.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="mb-4 flex items-center gap-2 rounded-input border border-border bg-surface px-3 sm:max-w-sm">
        <Search aria-hidden className="h-4 w-4 text-ink-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search bidder or tender ref…"
          aria-label="Search reports"
          className="h-10 w-full bg-transparent text-sm text-ink-900 focus:outline-none"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="search" title="No reports match" description="Try a different search." />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-1">
                <tr className="border-b border-border text-left text-xs font-semibold text-ink-500">
                  <th className="px-4 py-3">Bidder</th>
                  <th className="px-4 py-3">Tender</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Report hash</th>
                  <th className="px-4 py-3 text-right">Report</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.bidId} className={i % 2 === 1 ? "bg-surface-1/50" : undefined}>
                    <td className="px-4 py-3">
                      <Link href={`/bidders/${r.bidderId}`} className="no-hl font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="tnum block text-2xs text-ink-500">{r.tenderRef}</span>
                      <span className="text-ink-700">{r.tenderTitle}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tnum font-bold text-ink-900">{r.score}</span>
                        <RagBadge band={r.band} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.decided ? (
                        <span className="text-ink-700">
                          {r.decided.replace("_", " ")}
                          <span className="block text-2xs text-ink-500">{formatDate(r.decidedAt)}</span>
                        </span>
                      ) : (
                        <span className="text-2xs text-ink-500">pending</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-2xs text-ink-500">{truncateHash(r.hash)}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={reportUrl(r.bidId)} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm">
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 text-2xs text-ink-500">
        Reports are generated server-side (reportlab). If the backend is unreachable the download
        link will be unavailable · start the API to enable PDF export.
      </p>
    </div>
  );
}
