"use client";

import { useState } from "react";
import { FileCheck2, FileWarning, FileX2, ShieldCheck } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { SidePanel } from "@/components/ui/SidePanel";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DocumentRecord, Verdict } from "@/lib/types";

const DOC_ICON: Record<Verdict, typeof FileCheck2> = {
  PASS: FileCheck2,
  WARN: FileWarning,
  FAIL: FileX2,
  UNVERIFIABLE: FileWarning,
  NOT_APPLICABLE: FileCheck2,
};

const BORDER: Record<Verdict, string> = {
  PASS: "border-success/30",
  WARN: "border-warning/40",
  FAIL: "border-danger/40",
  UNVERIFIABLE: "border-info/30",
  NOT_APPLICABLE: "border-border",
};

export function DocumentsPanel({ documents }: { documents: DocumentRecord[] }) {
  const [active, setActive] = useState<DocumentRecord | null>(null);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((doc) => {
          const Icon = DOC_ICON[doc.forensics.verdict];
          return (
            <button
              key={doc.id}
              onClick={() => setActive(doc)}
              className={cn(
                "flex flex-col rounded-input border bg-surface-1 p-3 text-left transition-colors hover:bg-surface-2",
                BORDER[doc.forensics.verdict],
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    doc.forensics.verdict === "FAIL"
                      ? "bg-danger-bg text-danger"
                      : doc.forensics.verdict === "WARN"
                        ? "bg-warning-bg text-warning"
                        : "bg-success-bg text-success",
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
                <ModeBadge mode={doc.source === "digilocker" ? "LIVE" : "SIMULATED"} />
              </div>
              <p className="text-sm font-semibold text-ink-900">{doc.thumbnail_label}</p>
              <p className="mt-0.5 text-2xs capitalize text-ink-500">
                {doc.source === "digilocker" ? "DigiLocker issuer-signed" : "Uploaded"} ·{" "}
                {formatPercent(doc.extraction_confidence)} OCR
              </p>
              <div className="mt-2">
                <StatusChip verdict={doc.forensics.verdict} size="sm" label={`Forensics: ${doc.forensics.verdict === "PASS" ? "Clean" : doc.forensics.verdict}`} />
              </div>
            </button>
          );
        })}
      </div>

      <SidePanel
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.thumbnail_label ?? "Document"}
        subtitle="Forensic verdict, metadata diff and extraction details."
        width="lg"
      >
        {active && <DocDetail doc={active} />}
      </SidePanel>
    </>
  );
}

function DocDetail({ doc }: { doc: DocumentRecord }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <StatusChip verdict={doc.forensics.verdict} />
        <ModeBadge mode={doc.source === "digilocker" ? "LIVE" : "SIMULATED"} />
      </div>
      <p className="text-sm text-ink-700">{doc.forensics.summary}</p>

      <dl className="grid grid-cols-2 gap-3 rounded-input bg-surface-1 p-3 text-sm">
        <Detail label="Document type" value={doc.doc_type.replace(/_/g, " ")} />
        <Detail label="Source" value={doc.source} />
        <Detail label="OCR confidence" value={formatPercent(doc.extraction_confidence)} />
        <Detail label="File hash" value={<span className="tnum break-all text-2xs">{doc.file_hash}</span>} />
        {typeof doc.forensics.incremental_updates === "number" && (
          <Detail label="Incremental updates" value={<span className="tnum">{doc.forensics.incremental_updates}</span>} />
        )}
        {typeof doc.forensics.copy_move_regions === "number" && (
          <Detail label="Copy-move regions" value={<span className="tnum">{doc.forensics.copy_move_regions}</span>} />
        )}
      </dl>

      {doc.forensics.metadata_diff && doc.forensics.metadata_diff.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Metadata diff</h3>
          <div className="overflow-hidden rounded-input border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface-1 text-left text-2xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-2.5 py-2">Field</th>
                  <th className="px-2.5 py-2">Before (signed)</th>
                  <th className="px-2.5 py-2">After (current)</th>
                </tr>
              </thead>
              <tbody>
                {doc.forensics.metadata_diff.map((d) => (
                  <tr key={d.field} className="border-t border-border">
                    <td className="px-2.5 py-2 font-medium text-ink-900">{d.field}</td>
                    <td className="px-2.5 py-2 text-ink-500 line-through">{d.before}</td>
                    <td className="px-2.5 py-2 font-medium text-danger">{d.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {doc.forensics.ela_note && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">ELA note</h3>
          <p className="text-sm text-ink-700">{doc.forensics.ela_note}</p>
        </section>
      )}

      {doc.forensics.verdict === "PASS" && (
        <p className="flex items-center gap-2 rounded-input border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
          <ShieldCheck className="h-4 w-4" aria-hidden /> No tampering indicators detected.
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-ink-900">{value}</dd>
    </div>
  );
}
