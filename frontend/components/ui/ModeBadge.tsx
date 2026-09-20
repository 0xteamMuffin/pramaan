import { Radio, Database, Camera } from "lucide-react";
import { cn } from "@/lib/cn";
import { MODE_LABEL } from "@/lib/checks";
import type { ProviderMode } from "@/lib/types";

const MODE_STYLE: Record<ProviderMode, { cls: string; icon: typeof Radio }> = {
  LIVE: { cls: "bg-success-bg text-success border-success/30", icon: Radio },
  SIMULATED: { cls: "bg-info-bg text-info border-info/30", icon: Database },
  SNAPSHOT: { cls: "bg-secondary-50 text-secondary-dark border-secondary/30", icon: Camera },
};

interface ModeBadgeProps {
  mode: ProviderMode;
  className?: string;
}

/** LIVE / SIMULATED / SNAPSHOT badge for data-source honesty. */
export function ModeBadge({ mode, className }: ModeBadgeProps) {
  const s = MODE_STYLE[mode];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide",
        s.cls,
        className,
      )}
      title={`Data source mode: ${MODE_LABEL[mode]}`}
    >
      <Icon aria-hidden className="h-2.5 w-2.5" />
      {MODE_LABEL[mode]}
    </span>
  );
}
