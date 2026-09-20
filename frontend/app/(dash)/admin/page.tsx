"use client";

import Link from "next/link";
import { Database, KeyRound, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { RoleBadge } from "@/components/layout/RoleBadge";
import { StatusChip } from "@/components/ui/StatusChip";
import { DEMO_TENDERS, DEMO_USERS } from "@/lib/demoData";
import { checkLabel } from "@/lib/checks";
import { API_BASE } from "@/lib/api";
import { maskEmail } from "@/lib/format";

const ROLE_CAPS: Record<string, string> = {
  OFFICER: "Record decisions · toggle providers · full read",
  ANALYST: "Run verifications · view evidence · no decisions",
  AUDITOR: "Read-only · verify audit chain · export",
  ADMIN: "Manage templates, providers, users",
};

export default function AdminPage() {
  const templates = DEMO_TENDERS.map((t) => ({
    id: t.id,
    ref: t.ref_no,
    title: t.title,
    requirements: t.requirements ?? [],
  }));

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Roles, rule templates and platform configuration. Rules are data (per-tender templates), never hard-coded."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users / RBAC */}
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Users & roles (RBAC)"
              description="Seeded demo accounts. Password for all: pramaan123"
              icon={<Users className="h-5 w-5" />}
              className="mb-0"
            />
          </div>
          <ul className="divide-y divide-border">
            {DEMO_USERS.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{u.name}</p>
                  <p className="tnum truncate text-2xs text-ink-500">{maskEmail(u.email)}</p>
                  <p className="mt-0.5 text-2xs text-ink-500">{ROLE_CAPS[u.role]}</p>
                </div>
                <RoleBadge role={u.role} />
              </li>
            ))}
          </ul>
        </Card>

        {/* Rule templates */}
        <Card padded={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Rule templates"
              description="check_key → mandatory + params + weight. Editable per tender."
              icon={<Settings2 className="h-5 w-5" />}
              className="mb-0"
            />
          </div>
          <ul className="divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/tenders/${t.id}`} className="no-hl font-medium text-primary hover:underline">
                    {t.title}
                  </Link>
                  <span className="tnum text-2xs text-ink-500">{t.ref}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.requirements.map((r) => (
                    <span
                      key={r.check_key}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-1 px-2 py-0.5 text-2xs text-ink-700"
                      title={`${checkLabel(r.check_key)} · ${r.mandatory ? "mandatory" : "optional"}`}
                    >
                      {checkLabel(r.check_key)}
                      {r.mandatory && <span className="text-danger">*</span>}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* System */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Platform configuration"
            description="Empty-key guarantee: the whole platform runs end-to-end with no secrets configured."
            icon={<Database className="h-5 w-5" />}
          />
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SysItem label="API base" value={<span className="tnum break-all">{API_BASE}</span>} />
            <SysItem
              label="Secrets required"
              value={<StatusChip verdict="PASS" size="sm" label="None" />}
            />
            <SysItem label="Database" value="SQLite (zero-config)" />
            <SysItem label="AI fallback" value="Heuristic (offline)" />
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-input bg-surface-1 px-3 py-2.5 text-2xs text-ink-500">
            <KeyRound className="h-4 w-4 text-ink-500" aria-hidden />
            Providers upgrade from SIMULATED to LIVE automatically when API keys are supplied — no
            code change needed. Manage per-check modes on the{" "}
            <Link href="/providers" className="font-medium text-primary hover:underline">
              Providers
            </Link>{" "}
            screen.
          </div>
        </Card>
      </div>
    </div>
  );
}

function SysItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-input border border-border bg-surface p-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}
