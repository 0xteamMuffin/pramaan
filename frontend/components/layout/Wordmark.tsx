import { cn } from "@/lib/cn";

/**
 * Neutral PRAMAAN wordmark · deliberately NO Ashoka State Emblem
 * (State Emblem of India Act, 2005). A simple geometric shield glyph +
 * navy/saffron wordmark conveys "official, but not impersonating GoI".
 */
export function Wordmark({
  className,
  variant = "dark",
  showTagline = true,
}: {
  className?: string;
  variant?: "dark" | "light";
  showTagline?: boolean;
}) {
  const textColor = variant === "light" ? "text-white" : "text-primary-dark";
  const subColor = variant === "light" ? "text-white/70" : "text-ink-500";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary-dark shadow-card"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 2l7 3v6c0 4.5-3 8-7 11-4-3-7-6.5-7-11V5l7-3z" fill="rgb(var(--secondary))" />
          <path d="M9 12l2.2 2.2L15.5 10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className={cn("font-bold tracking-tight", textColor)}>
          <span className="text-lg">PRAMAAN</span>
        </div>
        {showTagline && (
          <div className={cn("text-2xs font-medium", subColor)}>
            Bid Compliance Verification
          </div>
        )}
      </div>
    </div>
  );
}
