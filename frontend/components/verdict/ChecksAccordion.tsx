"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Maximize2 } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { ProvenanceStamp } from "@/components/ui/ProvenanceStamp";
import { SidePanel } from "@/components/ui/SidePanel";
import { EvidencePanel } from "./EvidencePanel";
import { Button } from "@/components/ui/Button";
import { CHECK_META, DIMENSION_LABELS, checkLabel } from "@/lib/checks";
import { cn } from "@/lib/cn";
import type { CheckResult, Verdict } from "@/lib/types";

const SEVERITY: Record<Verdict, number> = {
  FAIL: 0,
  WARN: 1,
  UNVERIFIABLE: 2,
  PASS: 3,
  NOT_APPLICABLE: 4,
};

export function ChecksAccordion({ checks }: { checks: CheckResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [panelCheck, setPanelCheck] = useState<CheckResult | null>(null);

  const sorted = useMemo(
    () =>
      checks
        .slice()
        .sort((a, b) => {
          if (a.is_veto !== b.is_veto) return a.is_veto ? -1 : 1;
          return SEVERITY[a.verdict] - SEVERITY[b.verdict];
        }),
    [checks],
  );

  return (
    <>
      <ul className="divide-y divide-border">
        {sorted.map((check) => {
          const isOpen = expanded === check.key;
          const meta = CHECK_META[check.key];
          return (
            <li key={check.key}>
              <button
                onClick={() => setExpanded(isOpen ? null : check.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-2"
              >
                <StatusChip verdict={check.verdict} isVeto={check.is_veto} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-ink-900">
                      {checkLabel(check.key)}
                    </span>
                    <span className="hidden rounded-full bg-surface-2 px-1.5 py-0.5 text-2xs text-ink-500 sm:inline">
                      {DIMENSION_LABELS[meta.dimension]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-2xs text-ink-500">{check.summary}</span>
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn("h-4 w-4 shrink-0 text-ink-500 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="animate-fade-in bg-surface-1 px-5 py-4">
                  <p className="text-sm text-ink-700">{check.summary}</p>
                  <ProvenanceStamp
                    className="mt-2"
                    source={check.source}
                    method={check.method}
                    observedAt={check.observed_at}
                    mode={check.mode}
                  />
                  {check.evidence.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {check.evidence.slice(0, 3).map((e) => (
                        <li key={e.id} className="flex items-start gap-2 text-2xs text-ink-700">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          <span>
                            <span className="font-medium text-ink-900">{e.label}</span>
                            <span className="text-ink-500"> — {e.source} · {e.method}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setPanelCheck(check)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Open full evidence
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <SidePanel
        open={!!panelCheck}
        onClose={() => setPanelCheck(null)}
        title={panelCheck ? checkLabel(panelCheck.key) : "Evidence"}
        subtitle="Evidence drill-down — what was checked, from where, and when."
        width="xl"
      >
        {panelCheck && <EvidencePanel check={panelCheck} />}
      </SidePanel>
    </>
  );
}
