import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  Fingerprint,
  Network,
  ScanLine,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { Wordmark } from "@/components/layout/Wordmark";
import { VerdictMock, GraphMock, ForensicMock } from "@/components/landing/Mocks";

export const metadata = {
  title: "PRAMAAN · Bid Compliance Verification for GeM Procurement",
};

const CAPS = [
  {
    icon: ScanLine,
    title: "Document forensics",
    body: "Metadata diffs, incremental-update detection and ELA flag certificates edited after signing.",
  },
  {
    icon: Fingerprint,
    title: "Cross-portal reconciliation",
    body: "PAN is the join key. A PAN embedded in a GSTIN that differs from the declared PAN is surfaced automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Explainable score",
    body: "A weighted, six-dimension compliance score with hard vetoes. Every figure traces back to evidence.",
  },
  {
    icon: ScrollText,
    title: "Hash-chained audit",
    body: "Every check, recommendation and officer decision is written to a tamper-evident, exportable ledger.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-surface">
      {/* ---------------------------------------------------------------- Hero */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(160deg, rgb(var(--primary-darker)) 0%, rgb(var(--primary-dark)) 55%, rgb(var(--primary)) 130%)",
        }}
      >
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-10 h-96 w-96 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgb(var(--secondary)) 0%, transparent 65%)" }}
        />

        <header className="relative mx-auto flex w-full max-w-content items-center justify-between px-4 py-5 sm:px-8">
          <Wordmark variant="light" />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-input border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Sign in <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </header>

        <div className="relative mx-auto grid w-full max-w-content items-center gap-10 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-16">
          <div>
            <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
              Decision support for procuring officers
            </span>
            <h1
              className="reveal mt-5 text-4xl font-bold leading-[1.08] sm:text-5xl"
              style={{ ["--d" as string]: "60ms" }}
            >
              Evidence-first bid compliance verification for GeM procurement.
            </h1>
            <p
              className="reveal mt-5 max-w-xl text-base leading-relaxed text-white/80"
              style={{ ["--d" as string]: "140ms" }}
            >
              PRAMAAN ingests bidder documents and tender rules, cross-checks every claim against
              government sources, detects forgery and cartels, and produces an auditable verdict.
              The officer always makes the final decision.
            </p>
            <div
              className="reveal mt-8 flex flex-wrap items-center gap-3"
              style={{ ["--d" as string]: "220ms" }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-input bg-secondary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary-dark"
              >
                Enter the console <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#capabilities"
                className="inline-flex items-center gap-2 rounded-input border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                How it works
              </a>
            </div>
            <dl
              className="reveal mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/15 pt-6"
              style={{ ["--d" as string]: "300ms" }}
            >
              <Metric value="18" label="statutory & integrity checks" />
              <Metric value="~90s" label="per full verification run" />
              <Metric value="100%" label="of verdicts traceable to evidence" />
            </dl>
          </div>

          <div
            className="reveal-fade relative mx-auto w-full max-w-md"
            style={{ ["--d" as string]: "280ms" }}
          >
            <div className="float-slow">
              <VerdictMock />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Problem / value */}
      <section className="mx-auto w-full max-w-content px-4 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">
              The check that should take minutes takes days.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-700">
              An officer evaluating a GeM tender must open a dozen portals, reconcile names and
              identifiers by hand, eyeball certificates for tampering, and watch for related bidders
              colluding on price. It is slow, inconsistent, and hard to defend under audit.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink-900">One verdict, every claim proven.</h2>
            <p className="mt-4 text-base leading-relaxed text-ink-700">
              PRAMAAN runs the whole due-diligence sequence in one pass and leads with the answer: a
              compliance score, the risk band, the reasons ordered vetoes-first, and one click to the
              evidence behind each. Live, simulated and snapshot data are always labelled honestly.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Capabilities */}
      <section id="capabilities" className="bg-surface-1 py-16">
        <div className="mx-auto w-full max-w-content px-4 sm:px-8">
          <h2 className="max-w-2xl text-2xl font-bold text-ink-900">
            Built to catch what a manual review misses.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-ink-700">
            The signals that decide a tender are the hardest to spot by hand. These are the four
            PRAMAAN is built around.
          </p>

          {/* Bento: two signature mocks + a capability list, deliberately unequal */}
          <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
            <div className="rounded-card border border-border bg-surface p-6 lg:col-span-2">
              <div className="grid items-center gap-6 sm:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 text-2xs font-semibold text-danger">
                    <FileSearch className="h-3.5 w-3.5" aria-hidden /> Forgery reveal
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-ink-900">
                    A tampered certificate lights up on upload.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    Upload an OEM authorisation and the forensic engine compares it against the
                    issuer template, checks the PDF history, and highlights the recompressed
                    signature region.
                  </p>
                </div>
                <ForensicMock />
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-2.5 py-1 text-2xs font-semibold text-info">
                <Network className="h-3.5 w-3.5" aria-hidden /> Cartel graph
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink-900">
                Two rivals, one hidden director.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Bidders are linked by shared PAN, DIN, address, bank and submission IP. Collusive
                clusters are flagged and explained.
              </p>
              <div className="mt-4">
                <GraphMock />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CAPS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="rounded-card border border-border bg-surface p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink-900">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- CTA band */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background:
            "linear-gradient(120deg, rgb(var(--primary-dark)) 0%, rgb(var(--primary-darker)) 100%)",
        }}
      >
        <div aria-hidden className="bg-dot-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex w-full max-w-content flex-col items-start gap-6 px-4 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">See a full verdict, end to end.</h2>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Sign in with the demo officer account and walk a real bid from documents to decision.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-input bg-secondary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary-dark"
          >
            Enter the console <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------------- Footer */}
      <footer className="mx-auto w-full max-w-content px-4 py-8 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <Wordmark />
          <p className="max-w-xl text-2xs leading-relaxed text-ink-500">
            Not an official Government of India website. Neutral wordmark, no State Emblem (State
            Emblem of India Act, 2005). All data shown is synthetic. AI output is advisory; the
            procuring officer records the final decision.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="tnum text-2xl font-bold text-white">{value}</dd>
      <dt className="mt-1 text-2xs leading-snug text-white/65">{label}</dt>
    </div>
  );
}
