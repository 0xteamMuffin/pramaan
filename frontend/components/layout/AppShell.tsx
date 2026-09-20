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
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-500">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader onToggleNav={() => setNavOpen((o) => !o)} />
      <div className="mx-auto flex max-w-content">
        {/* Desktop sidebar */}
        <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-64 shrink-0 border-r border-border bg-surface lg:block">
          <LeftNav />
        </aside>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setNavOpen(false)} aria-hidden />
            <aside className="absolute left-0 top-0 h-full w-64 bg-surface shadow-popover">
              <LeftNav onNavigate={() => setNavOpen(false)} />
            </aside>
          </div>
        )}

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          {children}
          <footer className="mt-10 border-t border-border pt-4 text-2xs text-ink-500">
            <p>
              PRAMAAN is a decision-support prototype for GeM bid compliance verification. Not an
              official Government of India website. All data shown is synthetic. AI output is
              advisory — the procuring officer makes the final decision.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
