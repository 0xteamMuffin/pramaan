"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, UserCircle2 } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { GlobalSearch } from "./GlobalSearch";
import { RoleBadge } from "./RoleBadge";
import { useAuth } from "@/components/providers/AuthProvider";

export function AppHeader({ onToggleNav }: { onToggleNav?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 w-full max-w-content items-center gap-3 px-4 sm:px-8">
        <button
          className="-ml-1 rounded-md p-1.5 text-ink-700 hover:bg-surface-2 lg:hidden"
          onClick={onToggleNav}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="no-hl shrink-0">
          <Wordmark />
        </Link>
        <div className="ml-4 hidden flex-1 md:flex">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {user && <RoleBadge role={user.role} className="hidden sm:inline-flex" />}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 hover:bg-surface-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <UserCircle2 className="h-6 w-6 text-primary" aria-hidden />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-xs font-semibold text-ink-900">{user?.name ?? "Guest"}</span>
                <span className="block text-2xs text-ink-500">{user?.org ?? ""}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-ink-500" aria-hidden />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
                <div
                  className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-input border border-border bg-surface shadow-popover"
                  role="menu"
                >
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                    <p className="text-2xs text-ink-500">{user?.email}</p>
                    {user && <RoleBadge role={user.role} className="mt-1.5" />}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-700 hover:bg-surface-2"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" aria-hidden /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-border px-4 py-2 md:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
