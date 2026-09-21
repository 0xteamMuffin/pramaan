"use client";

import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { searchDebarment } from "@/lib/api";
import { cleanText, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DataMode } from "@/lib/api";
import type { DebarmentRecord } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  worldbank: "World Bank",
  cppp: "CPPP",
  ministry: "Ministry",
};

export default function DebarmentPage() {
  const [form, setForm] = useState({ q: "", pan: "", cin: "", din: "" });
  const [results, setResults] = useState<DebarmentRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<DataMode | null>(null);

  const run = async (override?: Partial<typeof form>) => {
    const query = { ...form, ...override };
    if (override) setForm(query);
    setLoading(true);
    const res = await searchDebarment(query);
    setResults(res.data);
    setMode(res.mode);
    setLoading(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run();
  };

  return (
    <div>
      <PageHeader
        title="Debarment search"
        description="Fuzzy screening against World Bank and CPPP debarment snapshots. Capture dates are shown for provenance."
        mode={mode}
      />

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <Card as="section">
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Name" value={form.q} onChange={(v) => setForm((f) => ({ ...f, q: v }))} placeholder="e.g. Indus Corp" />
            <Field label="PAN" value={form.pan} onChange={(v) => setForm((f) => ({ ...f, pan: v.toUpperCase() }))} placeholder="ABCDE1234F" />
            <Field label="CIN" value={form.cin} onChange={(v) => setForm((f) => ({ ...f, cin: v.toUpperCase() }))} placeholder="U74999TN2025PTC199888" />
            <Field label="DIN" value={form.din} onChange={(v) => setForm((f) => ({ ...f, din: v }))} placeholder="01928374" />
            <Button type="submit" loading={loading} className="w-full">
              <Search className="h-4 w-4" /> Search snapshots
            </Button>
          </form>
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-2xs font-semibold text-ink-500">Try an example</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-2xs text-ink-700 hover:bg-surface-2"
                onClick={() => run({ q: "Indus", pan: "", cin: "", din: "" })}
              >
                Name: Indus
              </button>
              <button
                className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-2xs text-ink-700 hover:bg-surface-2"
                onClick={() => run({ q: "", pan: "", cin: "", din: "01928374" })}
              >
                DIN: 01928374
              </button>
              <button
                className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-2xs text-ink-700 hover:bg-surface-2"
                onClick={() => run({ q: "", pan: "AAICI6677P", cin: "", din: "" })}
              >
                PAN: AAICI6677P
              </button>
            </div>
          </div>
        </Card>

        <div>
          {loading ? (
            <Card>
              <SkeletonRows rows={3} cols={3} />
            </Card>
          ) : results === null ? (
            <EmptyState
              icon="search"
              title="Search the debarment snapshots"
              description="Enter a name, PAN, CIN or DIN. Matches are fuzzy · a partial name will still surface candidates."
            />
          ) : results.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ShieldCheck className="h-8 w-8 text-success" aria-hidden />
                <p className="text-sm font-semibold text-ink-900">No debarment match found</p>
                <p className="text-sm text-ink-500">
                  No entity in the snapshot matches your query above the confidence threshold.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">
                {results.length} match(es) found · review grounds and period before acting.
              </p>
              {results.map((r) => (
                <Card key={r.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-danger-bg text-danger">
                        <ShieldAlert className="h-4 w-4" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">{r.entity_name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-ink-500">
                          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 font-medium">
                            {SOURCE_LABEL[r.source]}
                          </span>
                          <ModeBadge mode="SNAPSHOT" />
                          <span>captured {formatDate(r.captured_at)}</span>
                        </p>
                      </div>
                    </div>
                    {typeof r.match_score === "number" && (
                      <span
                        className={cn(
                          "tnum rounded-full px-2 py-0.5 text-2xs font-bold",
                          r.match_score >= 0.9 ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning",
                        )}
                      >
                        {formatPercent(r.match_score)} match
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Info label="Grounds" value={cleanText(r.grounds)} />
                    <Info label="Period" value={`${formatDate(r.from_date)} → ${formatDate(r.to_date)}`} />
                    {r.pan && <Info label="PAN" value={r.pan} />}
                    {r.din && <Info label="DIN" value={r.din} />}
                    {r.cin && <Info label="CIN" value={r.cin} />}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-2xs font-semibold text-ink-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="tnum h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-input bg-surface-1 px-3 py-2">
      <p className="text-2xs font-semibold text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink-900">{value}</p>
    </div>
  );
}
