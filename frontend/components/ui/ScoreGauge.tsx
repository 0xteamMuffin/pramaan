import { cn } from "@/lib/cn";
import { BAND_LABEL } from "@/lib/checks";
import type { RiskBand } from "@/lib/types";

interface ScoreGaugeProps {
  score: number; // 0-100
  band: RiskBand;
  size?: number; // px
  strokeWidth?: number;
  className?: string;
  showBand?: boolean;
}

const BAND_VAR: Record<RiskBand, string> = {
  LOW: "rgb(var(--rag-low))",
  MEDIUM: "rgb(var(--rag-medium))",
  HIGH: "rgb(var(--rag-high))",
};

/**
 * Radial 0–100 score gauge (270° sweep) coloured by RAG band, with a big number
 * and band label. Uses two SVG arcs (track + progress) — no chart dependency.
 */
export function ScoreGauge({
  score,
  band,
  size = 200,
  strokeWidth = 16,
  className,
  showBand = true,
}: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const sweep = 270; // degrees of the arc
  const startAngle = 135; // start at lower-left
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const progressLength = (clamped / 100) * arcLength;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Compliance score ${clamped} out of 100, ${BAND_LABEL[band]}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(${startAngle} ${cx} ${cy})`}>
          {/* track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgb(var(--rag-track))"
            strokeOpacity={0.28}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* progress */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={BAND_VAR[band]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${progressLength} ${circumference}`}
            style={{ transition: "stroke-dasharray .6s ease-out" }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tnum font-bold leading-none text-ink-900"
          style={{ fontSize: size * 0.28, color: BAND_VAR[band] }}
        >
          {clamped}
        </span>
        <span className="mt-1 text-xs font-medium text-ink-500">out of 100</span>
        {showBand && (
          <span
            className="mt-1.5 text-sm font-semibold"
            style={{ color: BAND_VAR[band] }}
          >
            {BAND_LABEL[band]}
          </span>
        )}
      </div>
    </div>
  );
}
