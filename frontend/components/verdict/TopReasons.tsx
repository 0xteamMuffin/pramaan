import { AlertOctagon, AlertTriangle, HelpCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

function toneFor(reason: string) {
  const r = reason.toUpperCase();
  if (r.startsWith("VETO")) return { cls: "border-danger/30 bg-danger-bg text-danger", Icon: AlertOctagon };
  if (r.startsWith("WARN")) return { cls: "border-warning/30 bg-warning-bg text-warning", Icon: AlertTriangle };
  if (r.startsWith("UNVERIFIABLE")) return { cls: "border-info/30 bg-info-bg text-info", Icon: HelpCircle };
  return { cls: "border-success/30 bg-success-bg text-success", Icon: ShieldCheck };
}

function asText(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (reason && typeof reason === "object") {
    const r = reason as { check_key?: string; verdict?: string; summary?: string };
    return [r.verdict, r.check_key, r.summary].filter(Boolean).join(" ");
  }
  return String(reason ?? "");
}

/** Top reasons chips, vetoes first (ordering handled by the scorer). */
export function TopReasons({ reasons }: { reasons: unknown[] }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {reasons.map((raw, i) => {
        const reason = asText(raw);
        const { cls, Icon } = toneFor(reason);
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              cls,
            )}
          >
            <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {reason}
          </span>
        );
      })}
    </div>
  );
}
