import { FlaskConical, GitCompareArrows, ScanSearch } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { ProvenanceStamp } from "@/components/ui/ProvenanceStamp";
import { checkLabel } from "@/lib/checks";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CheckResult, Evidence } from "@/lib/types";

/** Content for the evidence drill-down side panel. */
export function EvidencePanel({ check }: { check: CheckResult }) {
  const forensic = check.evidence.filter((e) => e.kind === "forensic");
  return (
    <div className="space-y-5">
      {/* header */}
      <div>
        <div className="flex items-center gap-2">
          <StatusChip verdict={check.verdict} isVeto={check.is_veto} />
          <span className="text-2xs text-ink-500">Confidence {formatPercent(check.confidence)}</span>
        </div>
        <p className="mt-2 text-sm text-ink-700">{check.summary}</p>
        <ProvenanceStamp
          className="mt-2"
          source={check.source}
          method={check.method}
          observedAt={check.observed_at}
          mode={check.mode}
        />
      </div>

      {/* cross-check field comparison */}
      {check.comparisons && check.comparisons.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <GitCompareArrows aria-hidden className="h-4 w-4 text-primary" /> Compared values
          </h3>
          <div className="overflow-x-auto rounded-input border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-1">
                <tr className="text-left text-2xs uppercase tracking-wide text-ink-500">
                  <th className="px-2.5 py-2">Field</th>
                  <th className="px-2.5 py-2">Declared</th>
                  <th className="px-2.5 py-2">PAN</th>
                  <th className="px-2.5 py-2">GST</th>
                  <th className="px-2.5 py-2">Udyam</th>
                  <th className="px-2.5 py-2">MCA</th>
                  <th className="px-2.5 py-2 text-right">Match</th>
                </tr>
              </thead>
              <tbody>
                {check.comparisons.map((c) => (
                  <tr key={c.field} className="border-t border-border">
                    <td className="px-2.5 py-2 font-medium text-ink-900">{c.field}</td>
                    <td className="px-2.5 py-2 text-ink-700">{c.declared || "—"}</td>
                    <td className="px-2.5 py-2 text-ink-700">{c.pan || "—"}</td>
                    <td className={cn("px-2.5 py-2", c.match_score < 0.5 ? "font-semibold text-danger" : "text-ink-700")}>
                      {c.gst || "—"}
                    </td>
                    <td className="px-2.5 py-2 text-ink-700">{c.udyam || "—"}</td>
                    <td className="px-2.5 py-2 text-ink-700">{c.mca || "—"}</td>
                    <td className="px-2.5 py-2 text-right">
                      <span
                        className={cn(
                          "tnum rounded-full px-1.5 py-0.5 text-2xs font-semibold",
                          c.match_score >= 0.9
                            ? "bg-success-bg text-success"
                            : c.match_score >= 0.5
                              ? "bg-warning-bg text-warning"
                              : "bg-danger-bg text-danger",
                        )}
                      >
                        {formatPercent(c.match_score)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* forensic (ELA heatmap note) */}
      {forensic.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <FlaskConical aria-hidden className="h-4 w-4 text-danger" /> Forensic findings
          </h3>
          <ElaHeatmap />
          <p className="mt-2 text-2xs text-ink-500">
            Error-Level-Analysis (ELA) heatmap is illustrative in the demo. Brighter regions indicate
            recompression consistent with post-signature editing.
          </p>
        </section>
      )}

      {/* raw evidence items */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <ScanSearch aria-hidden className="h-4 w-4 text-primary" /> Evidence ({check.evidence.length})
        </h3>
        {check.evidence.length === 0 ? (
          <p className="text-sm text-ink-500">No structured evidence attached to this check.</p>
        ) : (
          <ul className="space-y-2.5">
            {check.evidence.map((e) => (
              <EvidenceRow key={e.id} evidence={e} />
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-input bg-surface-1 px-3 py-2 text-2xs text-ink-500">
        Check: <span className="font-medium text-ink-700">{checkLabel(check.key)}</span>. All findings
        are converted to structured evidence before scoring — never an opaque number.
      </p>
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: Evidence }) {
  const entries = Object.entries(evidence.payload ?? {});
  return (
    <li className="rounded-input border border-border bg-surface-1 p-3">
      <p className="text-sm font-medium text-ink-900">{evidence.label}</p>
      <ProvenanceStamp
        className="mt-1"
        source={evidence.source}
        method={evidence.method}
        observedAt={evidence.observed_at}
      />
      {entries.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-2xs">
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-500">{k}</dt>
              <dd className="tnum break-all text-ink-900">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

/** Illustrative ELA heatmap tile (no real image dependency). */
function ElaHeatmap() {
  return (
    <div
      className="relative h-32 w-full overflow-hidden rounded-input border border-border"
      role="img"
      aria-label="Illustrative ELA heatmap highlighting a tampered signature region"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(45deg,#0f172a,#0f172a 6px,#111c33 6px,#111c33 12px)",
        }}
      />
      <div
        aria-hidden
        className="absolute right-6 top-8 h-14 w-28 rounded-md"
        style={{
          background: "radial-gradient(circle, #f5821f 0%, #c0392b 55%, transparent 75%)",
          filter: "blur(2px)",
        }}
      />
      <span className="absolute bottom-1.5 left-2 rounded bg-black/50 px-1.5 py-0.5 text-2xs text-white">
        signature block · anomaly
      </span>
    </div>
  );
}
