import { AlertCircle, Inbox, RefreshCw, SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: "inbox" | "search";
  action?: React.ReactNode;
  className?: string;
}

/** Purposeful empty state (never a blank panel). */
export function EmptyState({ title, description, icon = "inbox", action, className }: EmptyStateProps) {
  const Icon = icon === "search" ? SearchX : Inbox;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-1 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="mb-3 h-8 w-8 text-ink-500" />
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Distinct from empty/unverifiable: signals a real failure with a retry. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-danger/30 bg-danger-bg px-6 py-10 text-center",
        className,
      )}
    >
      <AlertCircle aria-hidden className="mb-3 h-8 w-8 text-danger" />
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-700">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw aria-hidden className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}
