"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenders", label: "Tenders", icon: FileText },
  { href: "/bidders", label: "Bidders", icon: Building2 },
  { href: "/debarment", label: "Debarment search", icon: ShieldAlert },
  { href: "/providers", label: "Providers", icon: Sliders },
  { href: "/audit", label: "Audit trail", icon: ScrollText },
  { href: "/reports", label: "Reports", icon: ShieldCheck },
  { href: "/admin", label: "Admin", icon: Settings2 },
];

export function LeftNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 p-3">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "no-hl group relative flex items-center gap-3 rounded-input px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-50 text-primary"
                    : "text-ink-700 hover:bg-surface-2 hover:text-ink-900",
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  aria-hidden
                  className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-ink-500")}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto rounded-input border border-border bg-surface-1 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          Advisory, not automatic
        </p>
        <p className="mt-1 text-2xs leading-relaxed text-ink-700">
          PRAMAAN scores and flags each bid. The officer records the final decision on every one.
        </p>
      </div>
    </nav>
  );
}
