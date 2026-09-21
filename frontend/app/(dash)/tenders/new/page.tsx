"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createTender } from "@/lib/api";
import { CHECK_META, CHECK_ORDER, DIMENSION_LABELS } from "@/lib/checks";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CheckKey, TenderCreateInput } from "@/lib/types";

const CATEGORIES: { value: TenderCreateInput["category"]; label: string }[] = [
  { value: "goods", label: "Goods" },
  { value: "services", label: "Services" },
  { value: "works", label: "Works" },
];

// Sensible default requirement set for a new tender.
const DEFAULTS: Record<string, { include: boolean; mandatory: boolean }> = {
  debarment: { include: true, mandatory: true },
  pan: { include: true, mandatory: true },
  gst: { include: true, mandatory: true },
  name_reconcile: { include: true, mandatory: false },
  turnover: { include: true, mandatory: true },
  cartel: { include: true, mandatory: false },
};

export default function NewTenderPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TenderCreateInput["category"]>("goods");
  const [buyer, setBuyer] = useState("CPCL");
  const [valueStr, setValueStr] = useState("");
  const [reqs, setReqs] = useState<Record<string, { include: boolean; mandatory: boolean }>>(() =>
    Object.fromEntries(
      CHECK_ORDER.map((k) => [k, DEFAULTS[k] ?? { include: false, mandatory: false }]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => Object.values(reqs).filter((r) => r.include).length,
    [reqs],
  );
  const estimatedValue = Number(valueStr.replace(/[^0-9]/g, "")) || 0;

  const toggle = (k: CheckKey, field: "include" | "mandatory") =>
    setReqs((prev) => {
      const cur = prev[k];
      if (field === "include") {
        const include = !cur.include;
        return { ...prev, [k]: { include, mandatory: include ? cur.mandatory : false } };
      }
      return { ...prev, [k]: { ...cur, mandatory: !cur.mandatory, include: true } };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Enter a tender title.");
      return;
    }
    if (selectedCount === 0) {
      setError("Select at least one eligibility check.");
      return;
    }
    setSaving(true);
    const requirements = CHECK_ORDER.filter((k) => reqs[k].include).map((k) => ({
      check_key: k,
      mandatory: reqs[k].mandatory,
      params: {},
    }));
    const res = await createTender({
      title: title.trim(),
      category,
      buyer_org: buyer.trim() || "CPCL",
      estimated_value: estimatedValue,
      requirements,
    });
    setSaving(false);
    router.push(`/tenders/${res.data.id}`);
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: "Tenders", href: "/tenders" }, { label: "New tender" }]}
        title="Create a tender"
        description="Define the tender and the eligibility rules bidders must satisfy. Rules are data, so they can be edited later per tender."
      />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Requirement selection (primary) */}
        <Card padded={false} as="section">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Eligibility checks</h2>
              <p className="mt-0.5 text-sm text-ink-700">
                Select the checks to run and mark which are mandatory for qualification.
              </p>
            </div>
            <span className="tnum shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary">
              {selectedCount} selected
            </span>
          </div>
          <ul className="divide-y divide-border">
            {CHECK_ORDER.map((k) => {
              const meta = CHECK_META[k];
              const state = reqs[k];
              return (
                <li
                  key={k}
                  className={cn(
                    "flex items-start gap-3 px-5 py-3 transition-colors",
                    state.include && "bg-primary-50/40",
                  )}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={state.include}
                    onClick={() => toggle(k, "include")}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                      state.include
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-transparent hover:border-primary",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggle(k, "include")}
                      className="block text-left"
                    >
                      <span className="text-sm font-medium text-ink-900">{meta.label}</span>
                      <span className="mt-0.5 block text-2xs text-ink-500">
                        {DIMENSION_LABELS[meta.dimension]}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(k, "mandatory")}
                    aria-pressed={state.mandatory}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-2xs font-semibold transition-colors",
                      state.mandatory
                        ? "border-danger/30 bg-danger-bg text-danger"
                        : "border-border bg-surface text-ink-500 hover:bg-surface-2",
                    )}
                  >
                    {state.mandatory ? "Mandatory" : "Optional"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Tender details + submit (secondary) */}
        <div className="space-y-6">
          <Card as="section">
            <h2 className="text-base font-semibold text-ink-900">Tender details</h2>
            <div className="mt-4 space-y-4">
              <FormField id="title" label="Title" required>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Supply of Industrial Centrifugal Pumps"
                  className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                />
              </FormField>
              <FormField id="category" label="Category">
                <div className="flex gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        "flex-1 rounded-input border px-3 py-2 text-sm font-medium transition-colors",
                        category === c.value
                          ? "border-primary bg-primary-50 text-primary"
                          : "border-border bg-surface text-ink-700 hover:bg-surface-2",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField id="buyer" label="Buyer organisation">
                <input
                  id="buyer"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  className="h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                />
              </FormField>
              <FormField
                id="value"
                label="Estimated value (₹)"
                hint={estimatedValue > 0 ? formatINR(estimatedValue, { compact: true }) : undefined}
              >
                <input
                  id="value"
                  inputMode="numeric"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  placeholder="32000000"
                  className="tnum h-10 w-full rounded-input border border-border bg-surface px-3 text-sm text-ink-900 focus:border-primary focus:outline-none"
                />
              </FormField>
            </div>
          </Card>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" loading={saving} className="flex-1">
              <FileCheck2 className="h-4 w-4" aria-hidden /> Create tender
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/tenders")}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FormField({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
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
