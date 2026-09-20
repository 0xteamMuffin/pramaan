"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

const DEMO_EMAIL = "officer@pramaan.gov.in";
const DEMO_PASSWORD = "pramaan123";

const FEATURES = [
  "13+ statutory checks with LIVE / SIMULATED / SNAPSHOT provenance",
  "Explainable compliance score, RAG band and hard vetoes",
  "Forgery, cross-portal mismatch and cartel detection",
  "Hash-chained, exportable audit trail — officer stays in control",
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated, ready } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isAuthenticated) router.replace("/dashboard");
  }, [ready, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (res.error === "invalid_credentials") {
      setError("Invalid email or password. Use the demo credentials shown below.");
      return;
    }
    setUser(res.data.user);
    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-[calc(100vh-33px)] lg:grid-cols-2">
      {/* Brand / value panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-dark p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-secondary/20 blur-3xl"
        />
        <Wordmark variant="light" />
        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            AI-powered bid compliance verification for GeM procurement.
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/70">
            PRAMAAN verifies bidder eligibility and statutory compliance, surfaces fraud with
            evidence, and produces an auditable verdict — so the procuring officer decides with
            confidence.
          </p>
          <ul className="mt-6 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/90">
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-2xs text-white/50">
          Not an official Government of India website · Neutral wordmark (no State Emblem) · All data
          synthetic.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-surface-1 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Wordmark />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">
            Officer / Analyst / Auditor / Admin access to the verification console.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-900">
                Email address
              </label>
              <div className="flex items-center gap-2 rounded-input border border-border bg-surface px-3 focus-within:border-primary">
                <Mail aria-hidden className="h-4 w-4 text-ink-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full bg-transparent text-sm text-ink-900 focus:outline-none"
                  placeholder="officer@pramaan.gov.in"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-900">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-input border border-border bg-surface px-3 focus-within:border-primary">
                <KeyRound aria-hidden className="h-4 w-4 text-ink-500" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full bg-transparent text-sm text-ink-900 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-input border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-input border border-dashed border-border bg-surface p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
              Demo credentials
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-sm">
              <code className="tnum text-ink-900">{DEMO_EMAIL}</code>
              <code className="text-ink-900">{DEMO_PASSWORD}</code>
            </div>
            <p className="mt-2 text-2xs text-ink-500">
              Works fully offline — if the backend API is unreachable the console runs on seeded
              demo data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
