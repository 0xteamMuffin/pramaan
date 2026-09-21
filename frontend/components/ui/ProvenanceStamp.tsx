import { cn } from "@/lib/cn";
import { asOn } from "@/lib/format";
import { ModeBadge } from "./ModeBadge";
import type { ProviderMode } from "@/lib/types";

interface ProvenanceStampProps {
  source: string;
  method: string;
  observedAt: string;
  mode?: ProviderMode;
  className?: string;
}

/** "source · method · as on <ts>" + mode badge · shown on every data point. */
export function ProvenanceStamp({
  source,
  method,
  observedAt,
  mode,
  className,
}: ProvenanceStampProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xs text-ink-500", className)}
    >
      <span className="font-medium text-ink-700">{source}</span>
      <span aria-hidden>·</span>
      <span>{method}</span>
      <span aria-hidden>·</span>
      <span className="tnum">{asOn(observedAt)}</span>
      {mode && <ModeBadge mode={mode} className="ml-1" />}
    </div>
  );
}
