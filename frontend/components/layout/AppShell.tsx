"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { LeftNav } from "./LeftNav";
import { useAuth } from "@/components/providers/AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-700">
        Redirecting to sign in.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="mx-auto flex w-full max-w-content">
        {/* Desktop sidebar · sticks directly beneath the 56px app header */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-surface lg:block">
          <LeftNav />
        </aside>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/50" onClick={() => setNavOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 h-full w-64 bg-surface shadow-popover">
              <LeftNav onNavigate={() => setNavOpen(false)} />
            </aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-8">
          {children}
          <footer className="mt-12 border-t border-border pt-4 text-2xs leading-relaxed text-ink-500">
            <p className="max-w-3xl">
              PRAMAAN is a decision-support prototype for GeM bid compliance verification. It is not an
              official Government of India website and all data shown is synthetic. Every AI output is
              advisory; the procuring officer records the final decision.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
