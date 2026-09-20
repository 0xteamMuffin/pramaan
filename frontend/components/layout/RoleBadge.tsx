import { cn } from "@/lib/cn";
import type { UserRole } from "@/lib/types";

const ROLE_STYLE: Record<UserRole, string> = {
  OFFICER: "bg-primary-50 text-primary border-primary/20",
  ANALYST: "bg-info-bg text-info border-info/20",
  AUDITOR: "bg-secondary-50 text-secondary-dark border-secondary/20",
  ADMIN: "bg-surface-2 text-ink-700 border-border",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
        ROLE_STYLE[role],
        className,
      )}
    >
      {role}
    </span>
  );
}
