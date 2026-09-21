"use client";

import { useState } from "react";
import { CheckCircle2, Gavel, PauseCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { recordDecision } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Decision, DecisionOutcome } from "@/lib/types";

const OPTIONS: { value: DecisionOutcome; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "QUALIFIED", label: "Qualified", icon: CheckCircle2, cls: "border-success/40 data-[on=true]:bg-success-bg data-[on=true]:text-success" },
  { value: "ON_HOLD", label: "On hold", icon: PauseCircle, cls: "border-warning/40 data-[on=true]:bg-warning-bg data-[on=true]:text-warning" },
  { value: "DISQUALIFIED", label: "Disqualified", icon: XCircle, cls: "border-danger/40 data-[on=true]:bg-danger-bg data-[on=true]:text-danger" },
];

export function DecisionArea({
  bidId,
  existing,
}: {
  bidId: string;
  existing?: Decision | null;
}) {
  const { user } = useAuth();
  const isOfficer = user?.role === "OFFICER" || user?.role === "ADMIN";
  const [decision, setDecision] = useState<Decision | null>(existing ?? null);
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const submit = async () => {
    if (!outcome) return;
    setSaving(true);
    const res = await recordDecision(bidId, outcome, note, user?.name ?? "Officer");
    setSaving(false);
    setDecision(res.data);
    setEditing(false);
    setOutcome(null);
    setNote("");
  };

  if (decision && !editing) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Gavel aria-hidden className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-ink-900">Officer decision · recorded</h3>
        </div>
        <div
          className={cn(
            "rounded-input border px-3 py-2.5",
            decision.outcome === "QUALIFIED"
              ? "border-success/30 bg-success-bg"
              : decision.outcome === "ON_HOLD"
                ? "border-warning/30 bg-warning-bg"
                : "border-danger/30 bg-danger-bg",
          )}
        >
          <p className="text-sm font-bold text-ink-900">{decision.outcome.replace("_", " ")}</p>
          {decision.note && <p className="mt-1 text-sm text-ink-700">“{decision.note}”</p>}
          <p className="mt-1.5 text-2xs text-ink-500">
            by {decision.officer_name} · {formatDateTime(decision.decided_at)} · written to audit trail
          </p>
        </div>
        {isOfficer && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditing(true)}>
            Revise decision
          </Button>
        )}
      </div>
    );
  }

  if (!isOfficer) {
    return (
      <p className="rounded-input bg-surface-1 px-3 py-2.5 text-sm text-ink-500">
        Only an Officer can record a decision. You are signed in as {user?.role}.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Gavel aria-hidden className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-ink-900">Record decision</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const on = outcome === opt.value;
          return (
            <button
              key={opt.value}
              data-on={on}
              onClick={() => setOutcome(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-input border bg-surface px-2 py-3 text-xs font-medium text-ink-700 transition-colors hover:bg-surface-2",
                opt.cls,
                on && "ring-2 ring-primary/30",
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
              {opt.label}
            </button>
          );
        })}
      </div>
      <label htmlFor="decision-note" className="mt-3 block text-2xs font-semibold text-ink-500">
        Reasoning (written to audit)
      </label>
      <textarea
        id="decision-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Record your reasoning · this is stored immutably in the audit trail."
        className="mt-1 w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-ink-900 focus:border-primary focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={submit} disabled={!outcome} loading={saving}>
          Record decision
        </Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
