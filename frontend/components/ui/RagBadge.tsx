import { cn } from "@/lib/cn";
import { BAND_LABEL } from "@/lib/checks";
import type { RiskBand } from "@/lib/types";

const BAND_STYLE: Record<RiskBand, string> = {
  LOW: "bg-success-bg text-success border-success/30",
  MEDIUM: "bg-warning-bg text-warning border-warning/30",
  HIGH: "bg-danger-bg text-danger border-danger/30",
};

const BAND_DOT: Record<RiskBand, string> = {
  LOW: "bg-rag-low",
  MEDIUM: "bg-rag-medium",
  HIGH: "bg-rag-high",
};

export function RagBadge({
  band,
  className,
  size = "md",
}: {
  band: RiskBand;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        BAND_STYLE[band],
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", BAND_DOT[band])} aria-hidden />
      {BAND_LABEL[band]}
    </span>
  );
}
