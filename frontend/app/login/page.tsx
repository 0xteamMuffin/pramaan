"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/layout/Wordmark";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

const DEMO_EMAIL = "officer@pramaan.gov.in";
const DEMO_PASSWORD = "pramaan123";

const CAPABILITIES = [
  "Cross-verifies eligibility against PAN, GST, Udyam, MCA and more",
  "Detects forged certificates, cross-portal mismatches and cartels",
  "Explains every score with evidence, provenance and a data-source badge",
  "Records the officer's decision in a hash-chained, exportable audit trail",
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
      setError("That email and password did not match. Use the demo account shown below.");
      return;
    }
    setUser(res.data.user);
    router.push("/dashboard");
  };

  return (
    <div className="grid min-h-[calc(100vh-33px)] lg:grid-cols-2">
      {/* Brand / value panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary-dark p-10 text-white lg:flex">
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, rgb(var(--secondary)), transparent)" }}
        />
        <Wordmark variant="light" />
        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            Verify bidder eligibility and statutory compliance for GeM procurement.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
            PRAMAAN compresses days of manual multi-portal checking into minutes, surfaces fraud with
            evidence, and leaves the final decision with the procuring officer.
          </p>
          <ul className="mt-6 space-y-2.5">
            {CAPABILITIES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white/90">
                <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative max-w-md text-2xs leading-relaxed text-white/55">
          Not an official Government of India website. Neutral wordmark, no State Emblem. All data
          shown is synthetic.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-surface-1 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Wordmark />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Sign in to the console</h2>
          <p className="mt-1 text-sm text-ink-700">
            Officer, Analyst, Auditor and Admin roles are supported.
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
                  placeholder="Enter your password"
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
              {loading ? "Signing in" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
            </Button>
          </form>

          <div className="mt-6 rounded-input border border-border bg-surface p-3">
            <p className="text-sm font-semibold text-ink-900">Demo account</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-sm">
              <code className="tnum text-ink-900">{DEMO_EMAIL}</code>
              <code className="text-ink-900">{DEMO_PASSWORD}</code>
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-ink-700">
              The console runs fully on seeded data if the backend is unreachable, so every screen
              stays functional during the demo.
            </p>
          </div>

          <p className="mt-6 text-center text-2xs text-ink-500">
            <a href="/" className="font-medium text-primary hover:underline">
              Back to the PRAMAAN overview
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
