import { AlertOctagon, Check, FileWarning, X } from "lucide-react";

/**
 * Crisp CSS/SVG product mock panels for the landing page. These deliberately
 * echo the real console components (score gauge, status chips, entity graph,
 * forensic panel) rather than showing empty coloured blocks.
 */

/** Mini verdict card: radial score gauge + band + reasons + sub-scores. */
export function VerdictMock() {
  const score = 24;
  const size = 108;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const arc = (270 / 360) * circ;
  const progress = (score / 100) * arc;
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-ink-900 shadow-popover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Chola Infra LLP</p>
          <p className="tnum text-2xs text-ink-500">GEM/2026/B/0026101 &middot; Bid ₹2.99 Cr</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-2xs font-semibold text-danger">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden /> High risk
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgb(var(--rag-track))"
                strokeOpacity={0.28}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${arc} ${circ}`}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgb(var(--rag-high))"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circ}`}
              />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-2xl font-bold" style={{ color: "rgb(var(--rag-high))" }}>
              {score}
            </span>
            <span className="text-2xs text-ink-500">/ 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Reason tone="danger" icon={<AlertOctagon className="h-3 w-3" />} text="VETO Forged OEM MAF" />
          <Reason tone="danger" icon={<X className="h-3 w-3" />} text="BIS registered to another brand" />
          <Reason tone="warning" icon={<FileWarning className="h-3 w-3" />} text="Local content evidence weak" />
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <SubBar label="Identity & legal" pct={92} tone="low" />
        <SubBar label="Eligibility & claims" pct={28} tone="high" />
        <SubBar label="Document integrity" pct={12} tone="high" />
      </div>
    </div>
  );
}

function Reason({
  tone,
  icon,
  text,
}: {
  tone: "danger" | "warning";
  icon: React.ReactNode;
  text: string;
}) {
  const cls = tone === "danger" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning";
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-2xs font-medium ${cls}`}>
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}

function SubBar({ label, pct, tone }: { label: string; pct: number; tone: "low" | "high" }) {
  const bar = tone === "low" ? "bg-rag-low" : "bg-rag-high";
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 truncate text-2xs text-ink-700">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className={`block h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tnum w-6 text-right text-2xs font-semibold text-ink-700">{pct}</span>
    </div>
  );
}

/** Mini entity graph: two bidders sharing a director node, flagged as a cluster. */
export function GraphMock() {
  return (
    <div className="overflow-hidden rounded-input border border-border bg-surface-1">
      <svg viewBox="0 0 260 150" className="h-auto w-full" role="img" aria-label="Two bidders linked by a shared director">
        {/* cluster ring */}
        <ellipse cx={130} cy={78} rx={112} ry={58} fill="rgb(var(--danger))" fillOpacity={0.06} stroke="rgb(var(--danger))" strokeOpacity={0.4} strokeDasharray="4 3" />
        {/* edges */}
        <line x1={60} y1={70} x2={130} y2={105} stroke="rgb(var(--danger))" strokeWidth={2} />
        <line x1={200} y1={70} x2={130} y2={105} stroke="rgb(var(--danger))" strokeWidth={2} />
        {/* bidder nodes */}
        <g>
          <circle cx={60} cy={70} r={18} fill="rgb(var(--primary))" stroke="#fff" strokeWidth={2} />
          <text x={60} y={104} textAnchor="middle" style={{ fontSize: 9 }} className="fill-ink-700 font-medium">
            Falcon
          </text>
        </g>
        <g>
          <circle cx={200} cy={70} r={18} fill="rgb(var(--primary))" stroke="#fff" strokeWidth={2} />
          <text x={200} y={104} textAnchor="middle" style={{ fontSize: 9 }} className="fill-ink-700 font-medium">
            Garuda
          </text>
        </g>
        {/* shared attribute node */}
        <g>
          <circle cx={130} cy={112} r={13} fill="rgb(var(--info))" stroke="#fff" strokeWidth={2} />
          <text x={130} y={137} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-ink-700 font-medium">
            DIN 03344556
          </text>
        </g>
      </svg>
      <p className="border-t border-border bg-danger-bg px-3 py-1.5 text-2xs font-medium text-danger">
        Shared director, bank and submission IP
      </p>
    </div>
  );
}

/** Mini forensic panel: a document with a flagged signature region + metadata diff. */
export function ForensicMock() {
  return (
    <div className="rounded-input border border-border bg-surface-1 p-3">
      <div className="flex items-start gap-3">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded border border-border bg-surface">
          <div className="space-y-1 p-2">
            <div className="h-1 w-full rounded bg-surface-2" />
            <div className="h-1 w-4/5 rounded bg-surface-2" />
            <div className="h-1 w-full rounded bg-surface-2" />
            <div className="h-1 w-3/5 rounded bg-surface-2" />
          </div>
          {/* flagged signature region */}
          <div
            className="absolute bottom-2 right-2 h-6 w-12 rounded"
            style={{
              background: "radial-gradient(circle, rgb(var(--secondary)) 0%, rgb(var(--danger)) 60%, transparent 78%)",
              filter: "blur(1px)",
            }}
            aria-hidden
          />
          <span className="absolute bottom-0 left-0 right-0 bg-danger/90 px-1 text-center text-[7px] font-semibold text-white">
            SIGNATURE
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold uppercase text-white">
            <X className="h-3 w-3" aria-hidden /> Fail
          </span>
          <dl className="mt-2 space-y-1 text-2xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-500">Producer</dt>
              <dd className="tnum truncate text-danger">Adobe → PDFsharp</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-500">ModDate</dt>
              <dd className="tnum truncate text-danger">2024 → 2026</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-ink-500">Updates</dt>
              <dd className="tnum text-danger">2 after sign</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1 text-2xs text-ink-700">
        <Check className="h-3 w-3 text-success" aria-hidden /> Compared against issuer template
      </p>
    </div>
  );
}
