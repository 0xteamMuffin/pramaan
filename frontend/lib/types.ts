/**
 * Typed contracts mirroring docs/03-architecture/{api-design,data-model}.md and
 * backend/app/models/enums.py. The demo-fallback data (lib/demoData.ts) conforms
 * to exactly these shapes so switching to the live API is seamless.
 */

// ---- Enums (string unions matching the backend) --------------------------------
export type Verdict = "PASS" | "WARN" | "FAIL" | "NOT_APPLICABLE" | "UNVERIFIABLE";
export type RiskBand = "LOW" | "MEDIUM" | "HIGH";
export type ProviderMode = "LIVE" | "SIMULATED" | "SNAPSHOT";
export type RunStatus = "queued" | "running" | "complete" | "failed";
export type RecommendationStance =
  | "RECOMMEND_QUALIFY"
  | "FURTHER_SCRUTINY"
  | "RECOMMEND_DISQUALIFY";
export type DecisionOutcome = "QUALIFIED" | "DISQUALIFIED" | "ON_HOLD";
export type UserRole = "OFFICER" | "ANALYST" | "AUDITOR" | "ADMIN";
export type TenderStatus = "draft" | "open" | "evaluating" | "awarded" | "closed";
export type IdentifierKind =
  | "PAN"
  | "GSTIN"
  | "UDYAM"
  | "CIN"
  | "DIN"
  | "EPFO"
  | "ESIC"
  | "DPIIT"
  | "NSIC"
  | "BIS";
export type EvidenceKind =
  | "portal_response"
  | "document_field"
  | "forensic"
  | "graph"
  | "rule";
export type Dimension =
  | "identity_legal_existence"
  | "tax_financial"
  | "eligibility_claim_authenticity"
  | "integrity_exclusion"
  | "statutory_labour"
  | "document_integrity";

export type CheckKey =
  | "pan"
  | "gst"
  | "udyam"
  | "mca"
  | "mii"
  | "epfo"
  | "esic"
  | "nsic"
  | "bis"
  | "startup"
  | "oem"
  | "digilocker"
  | "doc_integrity"
  | "debarment"
  | "turnover"
  | "name_reconcile"
  | "experience"
  | "cartel";

// ---- Provenance ---------------------------------------------------------------
export interface Provenance {
  source: string; // e.g. "GSTN (sandbox)"
  method: string; // e.g. "api-live", "snapshot", "ocr", "ELA"
  observed_at: string; // ISO timestamp
  mode: ProviderMode;
}

// ---- Auth ---------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  org: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

// ---- Tenders ------------------------------------------------------------------
export interface TenderRequirement {
  check_key: CheckKey;
  mandatory: boolean;
  params: Record<string, unknown>;
  weight_override?: number | null;
  label?: string;
}

export interface Tender {
  id: string;
  ref_no: string;
  title: string;
  buyer_org: string;
  category: "goods" | "services" | "works";
  estimated_value: number;
  status: TenderStatus;
  created_at: string;
  bidder_count: number;
  high_risk_count: number;
  requirements?: TenderRequirement[];
  rule_summary?: string[];
}

// ---- Bidders ------------------------------------------------------------------
export interface Identifier {
  kind: IdentifierKind;
  value: string;
  format_valid: boolean;
  source: "extracted" | "portal" | "declared";
}

export interface BidderContact {
  email: string;
  phone: string;
  address: string;
}

export interface Bidder {
  id: string;
  legal_name: string;
  trade_name: string;
  constitution: string;
  claimed_flags: Record<string, unknown>;
  primary_pan: string;
  contact: BidderContact;
  identifiers: Identifier[];
}

// ---- Documents ----------------------------------------------------------------
export interface ForensicFinding {
  verdict: Verdict;
  metadata_diff?: { field: string; before: string; after: string }[];
  ela_note?: string;
  copy_move_regions?: number;
  incremental_updates?: number;
  summary: string;
}

export interface DocumentRecord {
  id: string;
  bidder_id: string;
  doc_type: string;
  file_hash: string;
  source: "uploaded" | "digilocker";
  extraction_confidence: number;
  extracted: Record<string, unknown>;
  forensics: ForensicFinding;
  thumbnail_label: string;
}

// ---- Checks / Evidence --------------------------------------------------------
export interface Evidence {
  id: string;
  kind: EvidenceKind;
  label: string;
  source: string;
  method: string;
  observed_at: string;
  payload: Record<string, unknown>;
  document_id?: string | null;
}

export interface FieldComparison {
  field: string;
  declared: string;
  pan?: string;
  gst?: string;
  udyam?: string;
  mca?: string;
  match_score: number; // 0-1
}

export interface CheckResult {
  key: CheckKey;
  dimension: Dimension;
  verdict: Verdict;
  confidence: number;
  summary: string;
  source: string;
  method: string;
  observed_at: string;
  mode: ProviderMode;
  is_veto: boolean;
  evidence: Evidence[];
  data?: Record<string, unknown>;
  comparisons?: FieldComparison[];
}

// ---- Scoring ------------------------------------------------------------------
export interface Veto {
  key: CheckKey;
  why: string;
  evidence: string[];
}

export interface DimensionScore {
  name: string;
  dimension: Dimension;
  weight: number;
  score: number; // 0-1
  vetoes?: Veto[];
}

export interface ComplianceScore {
  score: number; // 0-100
  band: RiskBand;
  dimensions: DimensionScore[];
  vetoes: Veto[];
  reasons_top: string[];
}

// ---- Recommendation -----------------------------------------------------------
/** A backend evidence reference may be a plain id or a structured finding. */
export type EvidenceRef =
  | string
  | { check_key?: string; verdict?: Verdict | string; summary?: string };

export interface Recommendation {
  stance: RecommendationStance;
  rationale: string;
  evidence_refs: EvidenceRef[];
  model_meta: { provider: string; model: string; mode: ProviderMode };
}

// ---- Decision -----------------------------------------------------------------
export interface Decision {
  id: string;
  outcome: DecisionOutcome;
  note: string;
  officer_name: string;
  decided_at: string;
}

// ---- Verification run (aggregate for a bid/verdict view) ----------------------
export interface VerificationRun {
  run_id: string;
  bid_id: string;
  bidder_id: string;
  tender_id: string;
  status: RunStatus;
  provider_mode: ProviderMode | "mixed";
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
  checks: CheckResult[];
}

/** Everything the hero verdict screen needs, resolved in one shape. */
export interface BidVerdict {
  bid: {
    id: string;
    tender_id: string;
    bidder_id: string;
    quoted_value: number;
    submitted_at: string;
  };
  bidder: Bidder;
  tender: Pick<Tender, "id" | "ref_no" | "title" | "buyer_org">;
  run: VerificationRun;
  score: ComplianceScore;
  recommendation: Recommendation;
  documents: DocumentRecord[];
  decision?: Decision | null;
}

// ---- Comparison matrix --------------------------------------------------------
export interface ComparisonCell {
  key: CheckKey;
  verdict: Verdict;
  is_veto: boolean;
}

export interface ComparisonRow {
  bid_id: string;
  bidder_id: string;
  bidder_name: string;
  cells: ComparisonCell[];
  score: number;
  band: RiskBand;
  recommendation: RecommendationStance;
}

export interface ComparisonMatrix {
  tender_id: string;
  check_keys: CheckKey[];
  rows: ComparisonRow[];
}

// ---- Entity graph -------------------------------------------------------------
export interface GraphNode {
  id: string;
  type:
    | "bidder"
    | "pan"
    | "gstin"
    | "cin"
    | "din"
    | "address"
    | "email"
    | "phone"
    | "bank"
    | "ip";
  value: string;
  label: string;
  cluster?: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface GraphCluster {
  id: string;
  bidder_ids: string[];
  reason: string;
  severity: "high" | "medium" | "low";
}

export interface EntityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: GraphCluster[];
}

// ---- Debarment ----------------------------------------------------------------
export interface DebarmentRecord {
  id: string;
  source: "worldbank" | "cppp" | "ministry";
  entity_name: string;
  pan?: string | null;
  cin?: string | null;
  din?: string | null;
  grounds: string;
  from_date: string;
  to_date: string;
  captured_at: string;
  match_score?: number;
}

// ---- Providers ----------------------------------------------------------------
export interface ProviderConfig {
  check_key: CheckKey;
  label: string;
  chain: string[];
  mode: ProviderMode;
  available_modes: ProviderMode[];
  health: "ok" | "degraded" | "down";
  last_latency_ms: number;
}

export interface ProviderState {
  offline: boolean;
  providers: ProviderConfig[];
}

// ---- Audit --------------------------------------------------------------------
export interface AuditEvent {
  id: string;
  seq: number;
  actor: string;
  action: string;
  target: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
  created_at: string;
}

export interface AuditIntegrity {
  intact: boolean;
  broken_at_seq: number | null;
  count: number;
}

// ---- Analytics ----------------------------------------------------------------
export interface TimeSavings {
  manual_minutes_per_bidder: number;
  pramaan_seconds_per_bidder: number;
  bidders_processed: number;
  hours_saved: number;
  reduction_pct: number;
}

export interface AlertItem {
  id: string;
  kind: "debarment" | "forgery" | "cartel" | "mismatch" | "info";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  bidder_id?: string;
  tender_id?: string;
  created_at: string;
}

export interface RecentRun {
  run_id: string;
  bid_id: string;
  bidder_name: string;
  tender_ref: string;
  status: RunStatus;
  band?: RiskBand;
  score?: number;
  finished_at?: string;
}

export interface DashboardSummary {
  tenders_in_evaluation: number;
  bidders_pending: number;
  avg_score: number;
  red_flags: number;
  time_savings: TimeSavings;
  recent_runs: RecentRun[];
  alerts: AlertItem[];
}

// ---- Create payloads (wizards / upload flows) ---------------------------------
export interface TenderCreateInput {
  title: string;
  category: "goods" | "services" | "works";
  buyer_org: string;
  estimated_value: number;
  requirements: { check_key: CheckKey; mandatory: boolean; params: Record<string, unknown> }[];
}

export interface BidderCreateInput {
  legal_name: string;
  trade_name?: string;
  constitution: string;
  primary_pan: string;
  identifiers: { kind: IdentifierKind; value: string }[];
  tender_id: string;
  quoted_value: number;
}

/** POST /bidders returns the new bidder plus the bid_id created for the tender. */
export interface BidderCreated extends Bidder {
  bid_id: string;
}

// ---- Generic list wrapper -----------------------------------------------------
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
