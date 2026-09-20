import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "./Card";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "teal";
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  footer?: React.ReactNode;
  className?: string;
}

const TONE: Record<string, string> = {
  primary: "text-primary bg-primary-50",
  success: "text-success bg-success-bg",
  warning: "text-warning bg-warning-bg",
  danger: "text-danger bg-danger-bg",
  teal: "text-accent-teal bg-info-bg",
};

export function KpiCard({
  label,
  value,
  sublabel,
  icon,
  tone = "primary",
  delta,
  footer,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="tnum mt-1 text-3xl font-bold leading-tight text-ink-900">{value}</p>
          {sublabel && <p className="mt-0.5 text-xs text-ink-500">{sublabel}</p>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", TONE[tone])}>
            {icon}
          </div>
        )}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold",
            delta.good ? "bg-success-bg text-success" : "bg-danger-bg text-danger",
          )}
        >
          {delta.direction === "up" ? (
            <ArrowUpRight aria-hidden className="h-3 w-3" />
          ) : (
            <ArrowDownRight aria-hidden className="h-3 w-3" />
          )}
          {delta.value}
        </div>
      )}
      {footer && <div className="mt-3 border-t border-border pt-3 text-xs text-ink-500">{footer}</div>}
    </Card>
  );
}
