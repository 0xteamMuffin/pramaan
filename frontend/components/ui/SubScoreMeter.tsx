import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import type { DimensionScore } from "@/lib/types";

function toneForScore(score: number): { bar: string; text: string } {
  if (score >= 0.7) return { bar: "bg-rag-low", text: "text-success" };
  if (score >= 0.4) return { bar: "bg-rag-medium", text: "text-warning" };
  return { bar: "bg-rag-high", text: "text-danger" };
}

/** Segmented meter for one scoring dimension (with weight + veto flag). */
export function SubScoreMeter({ dimension }: { dimension: DimensionScore }) {
  const pct = Math.round(dimension.score * 100);
  const tone = toneForScore(dimension.score);
  const hasVeto = (dimension.vetoes?.length ?? 0) > 0;
  const segments = 10;
  const filled = Math.round(dimension.score * segments);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-ink-900">{dimension.name}</span>
        <span className="flex items-center gap-2">
          {hasVeto && (
            <span className="rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold uppercase text-white">
              veto
            </span>
          )}
          <span className={cn("tnum text-sm font-semibold", tone.text)}>{pct}</span>
        </span>
      </div>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-sm",
              i < filled ? tone.bar : "bg-surface-2",
            )}
          />
        ))}
      </div>
      <div className="mt-1 text-2xs text-ink-500">
        Weight {formatPercent(dimension.weight)} of total
      </div>
    </div>
  );
}
