"use client";

import { use } from "react";
import Link from "next/link";
import { Download, FileText, Fingerprint, Landmark, ListChecks, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { SubScoreMeter } from "@/components/ui/SubScoreMeter";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { TopReasons } from "@/components/verdict/TopReasons";
import { ChecksAccordion } from "@/components/verdict/ChecksAccordion";
import { DocumentsPanel } from "@/components/verdict/DocumentsPanel";
import { RecommendationPanel } from "@/components/verdict/RecommendationPanel";
import { DecisionArea } from "@/components/verdict/DecisionArea";
import { useResource } from "@/lib/useResource";
import { bidIdForBidder, getBidVerdict, reportUrl } from "@/lib/api";
import { formatINR, maskEmail, maskGstin, maskPan, maskPhone } from "@/lib/format";
import { RRSTANCE } from "@/lib/stance";

export default function BidderVerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const bidId = bidIdForBidder(id) ?? `bid-${id}`;
  const { data, loading, error, mode, refetch } = useResource(() => getBidVerdict(bidId), [bidId]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Loading verdict…" crumbs={[{ label: "Bidders", href: "/bidders" }]} />
        <div className="grid gap-6 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Verdict" crumbs={[{ label: "Bidders", href: "/bidders" }]} />
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Verdict" crumbs={[{ label: "Bidders", href: "/bidders" }]} />
        <EmptyState title="No verdict found" description="This bid has not been evaluated yet." />
      </div>
    );
  }

  const { bidder, tender, run, score, recommendation, documents, decision } = data;

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: "Tenders", href: "/tenders" },
          { label: tender.ref_no, href: `/tenders/${tender.id}` },
          { label: bidder.legal_name },
        ]}
        title={bidder.legal_name}
        description={`${bidder.trade_name} · ${bidder.constitution} · Bid ${formatINR(data.bid.quoted_value, { compact: true })} on ${tender.title}`}
        mode={mode}
        actions={
          <>
            <a href={reportUrl(bidId)} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4" /> Audit report (PDF)
              </Button>
            </a>
            <Button variant="secondary" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4" /> Re-verify
            </Button>
          </>
        }
      />

      {/* 1. Verdict banner */}
      <Card className="mb-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex shrink-0 justify-center">
            <ScoreGauge score={score.score} band={score.band} size={188} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500">
              Compliance verdict
            </p>
            <p className="mt-1 text-lg font-semibold text-ink-900">
              For the officer&apos;s consideration:{" "}
              <span
                className={
                  recommendation.stance === "RECOMMEND_QUALIFY"
                    ? "text-success"
                    : recommendation.stance === "FURTHER_SCRUTINY"
                      ? "text-warning"
                      : "text-danger"
                }
              >
                {RRSTANCE[recommendation.stance]}
              </span>
              .
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {run.checks.length} checks evaluated · run completed in{" "}
              <span className="tnum">{run.duration_seconds}s</span> · {score.vetoes.length} veto(es).
            </p>
            <div className="mt-3">
              <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
                Top reasons
              </p>
              <TopReasons reasons={score.reasons_top} />
            </div>
          </div>
          <div className="shrink-0">
            <a href="#decision">
              <Button variant="accent" size="lg">
                Record decision
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {/* 3. Sub-score meters */}
      <Card className="mb-6">
        <CardHeader
          title="Score breakdown"
          description="Weighted across six explainable dimensions. UNVERIFIABLE / N-A are excluded from the denominator (unverifiable ≠ fail)."
          icon={<ListChecks className="h-5 w-5" />}
        />
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {score.dimensions.map((d) => (
            <SubScoreMeter key={d.dimension} dimension={d} />
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: checks + documents */}
        <div className="space-y-6 lg:col-span-2">
          <Card padded={false}>
            <div className="p-5 pb-3">
              <CardHeader
                title="Statutory & compliance checks"
                description="Each check shows a verdict, provenance and data-source mode. Expand for evidence."
                className="mb-0"
              />
            </div>
            <ChecksAccordion checks={run.checks} />
          </Card>

          <Card>
            <CardHeader
              title="Documents & forensics"
              description="Uploaded and DigiLocker-signed certificates with tamper analysis."
              icon={<FileText className="h-5 w-5" />}
            />
            {documents.length === 0 ? (
              <EmptyState title="No documents" description="No certificates were submitted for this bid." />
            ) : (
              <DocumentsPanel documents={documents} />
            )}
          </Card>
        </div>

        {/* right: recommendation + decision + identity */}
        <div className="space-y-6">
          <Card>
            <RecommendationPanel recommendation={recommendation} />
          </Card>

          <Card id="decision" className="scroll-mt-24">
            <DecisionArea bidId={bidId} existing={decision} />
          </Card>

          <Card>
            <CardHeader title="Bidder identity" icon={<Fingerprint className="h-5 w-5" />} />
            <dl className="space-y-2.5 text-sm">
              <IdRow label="PAN" value={maskPan(bidder.primary_pan)} />
              {bidder.identifiers
                .filter((i) => i.kind !== "PAN")
                .map((idf) => (
                  <IdRow
                    key={idf.kind + idf.value}
                    label={idf.kind}
                    value={idf.kind === "GSTIN" ? maskGstin(idf.value) : idf.value}
                    valid={idf.format_valid}
                  />
                ))}
            </dl>
            <div className="mt-3 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-2xs text-ink-500">
                <Landmark className="h-3.5 w-3.5" aria-hidden /> {maskEmail(bidder.contact.email)} ·{" "}
                {maskPhone(bidder.contact.phone)}
              </p>
              <p className="mt-1 text-2xs text-ink-500">{bidder.contact.address}</p>
            </div>
            <Link
              href={`/tenders/${tender.id}/graph`}
              className="mt-3 inline-block text-2xs font-medium text-primary hover:underline"
            >
              View entity graph for this tender →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function IdRow({ label, value, valid }: { label: string; value: string; valid?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <span className="tnum text-sm text-ink-900">{value}</span>
        {valid === false && (
          <span className="rounded-full bg-danger-bg px-1.5 py-0.5 text-2xs font-semibold text-danger">
            invalid
          </span>
        )}
      </dd>
     </div>
  );
}
