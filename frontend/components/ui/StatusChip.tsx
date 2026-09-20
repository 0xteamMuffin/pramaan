import { AlertTriangle, Check, HelpCircle, Minus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { VERDICT_STYLE } from "@/lib/checks";
import type { Verdict } from "@/lib/types";

const ICONS = {
  check: Check,
  alert: AlertTriangle,
  x: X,
  help: HelpCircle,
  minus: Minus,
} as const;

const TONE_CLASSES: Record<string, string> = {
  success: "bg-success-bg text-success border-success/30",
  warning: "bg-warning-bg text-warning border-warning/30",
  danger: "bg-danger-bg text-danger border-danger/30",
  info: "bg-info-bg text-info border-info/30",
  neutral: "bg-surface-2 text-ink-500 border-border",
};

interface StatusChipProps {
  verdict: Verdict;
  isVeto?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

/** Pill = icon + label + colour. Never colour alone (WCAG AA). */
export function StatusChip({ verdict, isVeto, size = "md", className, label }: StatusChipProps) {
  const style = VERDICT_STYLE[verdict];
  const Icon = ICONS[style.icon];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        TONE_CLASSES[style.tone],
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        className,
      )}
      role="status"
    >
      <Icon aria-hidden className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{label ?? style.label}</span>
      {isVeto && (
        <span className="ml-0.5 rounded-full bg-danger px-1 text-2xs font-bold uppercase text-white">
          veto
        </span>
      )}
    </span>
  );
}
