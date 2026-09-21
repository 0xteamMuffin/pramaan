import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article";
  padded?: boolean;
}

/**
 * Surface primitive. A single hairline border defines the edge · never a border
 * plus a soft shadow (no "ghost cards"). Cards are used only where a container
 * is the right affordance and are never nested.
 */
export function Card({ className, padded = true, as = "div", children, ...rest }: CardProps) {
  const Comp = as;
  return (
    <Comp
      className={cn(
        "rounded-card border border-border bg-surface",
        padded && "p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, description, icon, action, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-2.5">
        {icon && <div className="mt-0.5 text-primary">{icon}</div>}
        <div>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
