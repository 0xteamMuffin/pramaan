"use client";

import { useEffect, useState } from "react";
import { Activity, PowerOff, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { ErrorState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useResource } from "@/lib/useResource";
import { getProviders, setOffline as apiSetOffline, setProviderMode } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/cn";
import type { ProviderConfig, ProviderMode, ProviderState } from "@/lib/types";

const HEALTH_STYLE: Record<string, string> = {
  ok: "bg-success-bg text-success",
  degraded: "bg-warning-bg text-warning",
  down: "bg-danger-bg text-danger",
};

export default function ProvidersPage() {
  const { data, loading, error, mode, refetch } = useResource(getProviders, []);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "OFFICER";
  const [state, setState] = useState<ProviderState | null>(null);

  useEffect(() => {
    if (data) setState(data);
  }, [data]);

  const changeMode = async (checkKey: string, newMode: ProviderMode) => {
    setState((s) =>
      s
        ? {
            ...s,
            providers: s.providers.map((p) =>
              p.check_key === checkKey ? { ...p, mode: newMode } : p,
            ),
          }
        : s,
    );
    await setProviderMode(checkKey, newMode);
  };

  const toggleOffline = async () => {
    if (!state) return;
    const next = !state.offline;
    setState((s) =>
      s
        ? {
            ...s,
            offline: next,
            providers: next
              ? s.providers.map((p) => ({
                  ...p,
                  mode: p.available_modes.includes("SIMULATED") ? "SIMULATED" : p.mode,
                }))
              : s.providers,
          }
        : s,
    );
    await apiSetOffline(next);
  };

  return (
    <div>
      <PageHeader
        title="Providers"
        description="Per-check provider chains and data-source mode. Flip LIVE ↔ SIMULATED on stage, or force everything offline."
        mode={mode}
      />

      {/* global offline switch */}
      <Card className={cn("mb-6", state?.offline && "border-secondary/40 bg-secondary-50")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                state?.offline ? "bg-secondary text-white" : "bg-surface-2 text-ink-500",
              )}
            >
              {state?.offline ? <PowerOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Global offline mode</p>
              <p className="mt-0.5 max-w-lg text-sm text-ink-500">
                Forces local AI (Heuristic) and mock / snapshot providers. Demonstrates that PRAMAAN
                keeps working with zero external dependencies · the empty-key guarantee.
              </p>
            </div>
          </div>
          <Toggle
            checked={!!state?.offline}
            onChange={toggleOffline}
            disabled={!isAdmin}
            label="Toggle global offline mode"
          />
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader
            title="Provider chains"
            description="Fallback chain per check with current mode, health and last latency."
            icon={<Activity className="h-5 w-5" />}
            className="mb-0"
          />
        </div>
        {loading ? (
          <div className="p-5">
            <SkeletonRows rows={6} cols={4} />
          </div>
        ) : error && !state ? (
          <div className="p-5">
            <ErrorState onRetry={refetch} />
          </div>
        ) : state ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-surface-1">
                <tr className="border-b border-border text-left text-xs font-semibold text-ink-500">
                  <th className="px-4 py-3">Check</th>
                  <th className="px-4 py-3">Fallback chain</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3 text-right">Latency</th>
                  <th className="px-4 py-3 text-center">Mode</th>
                </tr>
              </thead>
              <tbody>
                {state.providers.map((p, i) => (
                  <ProviderRow
                    key={p.check_key}
                    provider={p}
                    zebra={i % 2 === 1}
                    offline={state.offline}
                    canEdit={isAdmin}
                    onChange={(m) => changeMode(p.check_key, m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function ProviderRow({
  provider,
  zebra,
  offline,
  canEdit,
  onChange,
}: {
  provider: ProviderConfig;
  zebra: boolean;
  offline: boolean;
  canEdit: boolean;
  onChange: (m: ProviderMode) => void;
}) {
  return (
    <tr className={cn("border-b border-border last:border-0", zebra && "bg-surface-1/50")}>
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900">{provider.label}</p>
        <p className="text-2xs text-ink-500">{provider.check_key}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1">
          {provider.chain.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs text-ink-700">{c}</span>
              {i < provider.chain.length - 1 && <span className="text-ink-500">→</span>}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("rounded-full px-2 py-0.5 text-2xs font-semibold capitalize", HEALTH_STYLE[provider.health])}>
          {provider.health}
        </span>
      </td>
      <td className="tnum px-4 py-3 text-right text-ink-700">{provider.last_latency_ms} ms</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {provider.available_modes.map((m) => {
            const disabled = !canEdit || (offline && m === "LIVE");
            const active = provider.mode === m;
            return (
              <button
                key={m}
                disabled={disabled}
                onClick={() => onChange(m)}
                className={cn(
                  "rounded-full border px-2 py-1 text-2xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-ink-700 hover:bg-surface-2",
                )}
                aria-pressed={active}
              >
                {m}
              </button>
            );
          })}
          {!provider.available_modes.includes(provider.mode) && <ModeBadge mode={provider.mode} />}
        </div>
      </td>
    </tr>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-secondary" : "bg-rag-track",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
