"use client";

import { use, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileCheck2,
  FileX2,
  Loader2,
  PlayCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { createBidder, uploadDocument, verifyBid, getTender } from "@/lib/api";
import { useResource } from "@/lib/useResource";
import { formatINR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { DocumentRecord } from "@/lib/types";

type Step = "details" | "documents" | "verifying";

const CONSTITUTIONS = ["Private Limited", "Proprietorship", "Partnership", "LLP", "Public Limited"];
const DOC_TYPES = [
  { value: "udyam_certificate", label: "Udyam certificate" },
  { value: "gst_certificate", label: "GST certificate" },
  { value: "oem_maf", label: "OEM authorisation (MAF)" },
  { value: "bis_certificate", label: "BIS certificate" },
  { value: "turnover_certificate", label: "CA turnover certificate" },
  { value: "uploaded_document", label: "Other document" },
];

interface UploadEntry {
  key: string;
  fileName: string;
  docType: string;
  status: "uploading" | "done" | "error";
  progress: number;
  record?: DocumentRecord;
}

export default function AddBidderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tenderId } = use(params);
  const router = useRouter();
  const tender = useResource(() => getTender(tenderId), [tenderId]);

  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);

  // details
  const [legalName, setLegalName] = useState("");
  const [constitution, setConstitution] = useState(CONSTITUTIONS[0]);
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [quoted, setQuoted] = useState("");
  const [creating, setCreating] = useState(false);

  // created ids
  const [bidderId, setBidderId] = useState<string | null>(null);
  const [bidId, setBidId] = useState<string | null>(null);

  // uploads
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const flagged = uploads.some((u) => u.record?.forensics.verdict === "FAIL");

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!legalName.trim()) return setError("Enter the bidder's legal name.");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase()))
      return setError("Enter a valid 10-character PAN (e.g. AAACA1234C).");
    setCreating(true);
    const res = await createBidder({
      legal_name: legalName.trim(),
      trade_name: legalName.trim(),
      constitution,
      primary_pan: pan.trim().toUpperCase(),
      identifiers: gstin.trim() ? [{ kind: "GSTIN", value: gstin.trim().toUpperCase() }] : [],
      tender_id: tenderId,
      quoted_value: Number(quoted.replace(/[^0-9]/g, "")) || 0,
    });
    setCreating(false);
    setBidderId(res.data.id);
    setBidId(res.data.bid_id);
    setStep("documents");
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !bidderId) return;
      const list = Array.from(files);
      for (const file of list) {
        const key = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setUploads((u) => [
          ...u,
          { key, fileName: file.name, docType, status: "uploading", progress: 8 },
        ]);
        // simulate smooth progress while the request is in flight
        const timer = setInterval(() => {
          setUploads((u) =>
            u.map((e) => (e.key === key && e.status === "uploading" ? { ...e, progress: Math.min(90, e.progress + 14) } : e)),
          );
        }, 160);
        const res = await uploadDocument(bidderId, file, docType);
        clearInterval(timer);
        setUploads((u) =>
          u.map((e) =>
            e.key === key ? { ...e, status: "done", progress: 100, record: res.data } : e,
          ),
        );
      }
    },
    [bidderId, docType],
  );

  const runVerification = async () => {
    if (!bidId) return;
    setStep("verifying");
    await verifyBid(bidId);
    // The verdict view resolves a bid id directly against /bids/{id}/verdict.
    setTimeout(() => router.push(`/bidders/${bidId}`), 1400);
  };

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Tenders", href: "/tenders" },
          { label: tender.data?.ref_no ?? tenderId, href: `/tenders/${tenderId}` },
          { label: "Add bidder" },
        ]}
        title="Add a bidder"
        description={
          tender.data
            ? `Submit a bid against ${tender.data.title}. Upload certificates for forensic analysis, then run verification.`
            : "Submit a bid, upload certificates for forensic analysis, then run verification."
        }
      />

      <Stepper step={step} />

      <div className="mt-6">
        {step === "details" && (
          <form onSubmit={submitDetails} className="max-w-2xl">
            <Card as="section">
              <h2 className="text-base font-semibold text-ink-900">Bidder details</h2>
              <p className="mt-0.5 text-sm text-ink-700">
                PAN is the identity join key used to reconcile every other portal.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field id="legal" label="Legal name" required className="sm:col-span-2">
                  <input
                    id="legal"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. Aarav Pumps Private Limited"
                    className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                  />
                </Field>
                <Field id="constitution" label="Constitution">
                  <select
                    id="constitution"
                    value={constitution}
                    onChange={(e) => setConstitution(e.target.value)}
                    className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                  >
                    {CONSTITUTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field id="pan" label="PAN" required>
                  <input
                    id="pan"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="AAACA1234C"
                    className="tnum h-10 w-full rounded-input border border-border bg-surface px-3 text-sm uppercase text-ink-900 focus:border-primary focus:outline-none"
                  />
                </Field>
                <Field id="gstin" label="GSTIN">
                  <input
                    id="gstin"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="33AAACA1234C1Z5"
                    className="tnum h-10 w-full rounded-input border border-border bg-surface px-3 uppercase text-sm text-ink-900 focus:border-primary focus:outline-none"
                  />
                </Field>
                <Field
                  id="quoted"
                  label="Quoted value (₹)"
                  hint={
                    Number(quoted.replace(/[^0-9]/g, ""))
                      ? formatINR(Number(quoted.replace(/[^0-9]/g, "")), { compact: true })
                      : undefined
                  }
                >
                  <input
                    id="quoted"
                    inputMode="numeric"
                    value={quoted}
                    onChange={(e) => setQuoted(e.target.value)}
                    placeholder="30400000"
                    className="tnum h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                  />
                </Field>
              </div>
            </Card>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="mt-4 flex items-center gap-2">
              <Button type="submit" loading={creating}>
                Continue to documents <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Link href={`/tenders/${tenderId}`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        )}

        {step === "documents" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <Card as="section">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-ink-900">Upload certificates</h2>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-ink-700">Type</span>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="h-8 rounded-input border border-border bg-surface px-2 text-sm text-ink-900 focus:border-primary focus:outline-none"
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-primary bg-primary-50" : "border-border bg-surface-1",
                  )}
                >
                  <UploadCloud className="h-8 w-8 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-medium text-ink-900">
                    Drag certificates here, or
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="ml-1 text-primary underline underline-offset-2"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="mt-1 text-2xs text-ink-500">
                    PDF, PNG or JPG. Each file is scanned for tampering on upload.
                  </p>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="sr-only"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {uploads.length > 0 && (
                  <ul className="mt-4 space-y-3">
                    {uploads.map((u) => (
                      <UploadRow key={u.key} entry={u} />
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-ink-900">Ready to verify</h2>
                <p className="mt-1 text-sm text-ink-700">
                  {uploads.filter((u) => u.status === "done").length} document(s) analysed.
                  {flagged && (
                    <span className="mt-2 flex items-start gap-1.5 rounded-input border border-danger/30 bg-danger-bg px-2.5 py-2 text-2xs font-medium text-danger">
                      <FileX2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      A document failed forensic integrity. Verification will record this as a
                      finding for the officer.
                    </span>
                  )}
                </p>
                <Button className="mt-3 w-full" onClick={runVerification}>
                  <PlayCircle className="h-4 w-4" aria-hidden /> Run verification
                </Button>
                <p className="mt-2 text-2xs text-ink-500">
                  You can also run verification with no documents; unverifiable checks are reported
                  as needing manual review, not as failures.
                </p>
              </Card>
            </aside>
          </div>
        )}

        {step === "verifying" && (
          <Card className="mx-auto max-w-lg">
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
              <p className="mt-4 text-base font-semibold text-ink-900">Running verification</p>
              <p className="mt-1 max-w-sm text-sm text-ink-700">
                Cross-checking identity, tax, eligibility, integrity and labour compliance across
                providers. Opening the verdict shortly.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "details", label: "Bidder details" },
    { key: "documents", label: "Documents" },
    { key: "verifying", label: "Verify" },
  ];
  const order: Step[] = ["details", "documents", "verifying"];
  const current = order.indexOf(step);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-2xs font-semibold",
                done
                  ? "border-success bg-success text-white"
                  : active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-ink-500",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={cn("font-medium", active ? "text-ink-900" : "text-ink-500")}>{s.label}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function UploadRow({ entry }: { entry: UploadEntry }) {
  const rec = entry.record;
  const fail = rec?.forensics.verdict === "FAIL";
  return (
    <li
      className={cn(
        "rounded-input border bg-surface p-3",
        fail ? "border-danger/40" : rec ? "border-success/40" : "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            fail ? "bg-danger-bg text-danger" : rec ? "bg-success-bg text-success" : "bg-surface-2 text-ink-500",
          )}
        >
          {entry.status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : fail ? (
            <FileX2 className="h-4 w-4" aria-hidden />
          ) : (
            <FileCheck2 className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{entry.fileName}</p>
          {entry.status === "uploading" ? (
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${entry.progress}%` }}
              />
            </div>
          ) : (
            rec && (
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-2xs text-ink-500">
                <ModeBadge mode={rec.source === "digilocker" ? "LIVE" : "SIMULATED"} />
                <span>{formatPercent(rec.extraction_confidence)} extraction confidence</span>
              </p>
            )
          )}
        </div>
        {rec && (
          <StatusChip
            verdict={rec.forensics.verdict}
            size="sm"
            label={rec.forensics.verdict === "PASS" ? "Clean" : rec.forensics.verdict}
          />
        )}
      </div>

      {rec && rec.forensics.verdict !== "PASS" && (
        <div className="mt-3 rounded-input bg-danger-bg px-3 py-2">
          <p className="text-2xs font-medium text-danger">{rec.forensics.summary}</p>
          {rec.forensics.metadata_diff && rec.forensics.metadata_diff.length > 0 && (
            <dl className="mt-2 space-y-1 text-2xs">
              {rec.forensics.metadata_diff.map((d) => (
                <div key={d.field} className="flex items-center gap-2">
                  <dt className="w-20 shrink-0 text-ink-700">{d.field}</dt>
                  <dd className="tnum text-ink-700">
                    <span className="text-ink-500 line-through">{d.before}</span>
                    <span className="mx-1 text-ink-500" aria-hidden>
                      &rarr;
                    </span>
                    <span className="font-semibold text-danger">{d.after}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {rec && rec.forensics.verdict === "PASS" && (
        <p className="mt-2 flex items-center gap-1.5 text-2xs text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> No tampering indicators detected.
        </p>
      )}
    </li>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-900">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
        {hint && <span className="tnum text-2xs font-medium text-ink-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
    >
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}
