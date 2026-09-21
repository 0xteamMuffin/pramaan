/**
 * Rich, deterministic demo-fallback dataset.
 *
 * Mirrors the exact API payload shapes in lib/types.ts so that when the live
 * FastAPI backend is unreachable the UI still renders fully. Encodes the planted
 * frauds and golden outcomes from docs/05-data/dummy-dataset-spec.md so every
 * detector has something to catch on stage.
 *
 * All identifiers are FAKE but format-valid; all PII is synthetic.
 */
import type {
  AlertItem,
  AuditEvent,
  BidVerdict,
  Bidder,
  CheckKey,
  CheckResult,
  ComparisonMatrix,
  ComparisonRow,
  ComplianceScore,
  DashboardSummary,
  DebarmentRecord,
  DocumentRecord,
  EntityGraph,
  Evidence,
  ProviderMode,
  ProviderState,
  Recommendation,
  RecommendationStance,
  RiskBand,
  Tender,
  TimeSavings,
  User,
  Verdict,
} from "./types";
import { CHECK_META, DIMENSION_LABELS, DIMENSION_WEIGHTS } from "./checks";

const NOW = "2026-09-19T10:30:00Z";
const T = (h: number, m: number) =>
  `2026-09-19T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00Z`;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const DEMO_USERS: User[] = [
  {
    id: "u-officer",
    name: "R. Meenakshi",
    email: "officer@pramaan.gov.in",
    role: "OFFICER",
    org: "CPCL · Procurement",
  },
  {
    id: "u-analyst",
    name: "A. Verma",
    email: "analyst@pramaan.gov.in",
    role: "ANALYST",
    org: "CPCL · Procurement",
  },
  {
    id: "u-auditor",
    name: "S. Nair",
    email: "auditor@pramaan.gov.in",
    role: "AUDITOR",
    org: "CVC Liaison",
  },
  {
    id: "u-admin",
    name: "Admin",
    email: "admin@pramaan.gov.in",
    role: "ADMIN",
    org: "PRAMAAN Platform",
  },
];

export const DEMO_CREDENTIALS: Record<string, string> = {
  "officer@pramaan.gov.in": "pramaan123",
  "analyst@pramaan.gov.in": "pramaan123",
  "auditor@pramaan.gov.in": "pramaan123",
  "admin@pramaan.gov.in": "pramaan123",
};

// ---------------------------------------------------------------------------
// Tenders
// ---------------------------------------------------------------------------
export const DEMO_TENDERS: Tender[] = [
  {
    id: "t1",
    ref_no: "GEM/2026/B/4412201",
    title: "Supply of Industrial Centrifugal Pumps",
    buyer_org: "CPCL · Chennai Petroleum Corporation Ltd",
    category: "goods",
    estimated_value: 32_000_000,
    status: "evaluating",
    created_at: "2026-09-02T09:00:00Z",
    bidder_count: 4,
    high_risk_count: 2,
    rule_summary: [
      "Turnover ≥ ₹2 Cr / yr (3 yrs)",
      "MII Class-I mandatory",
      "OEM / MAF for quoted brand",
      "BIS for product",
      "EMD (MSE exempt)",
    ],
    requirements: [
      { check_key: "turnover", mandatory: true, params: { min_turnover: 20000000, years: 3 } },
      { check_key: "mii", mandatory: true, params: { class: "I" } },
      { check_key: "oem", mandatory: true, params: {} },
      { check_key: "bis", mandatory: true, params: {} },
      { check_key: "gst", mandatory: true, params: {} },
      { check_key: "pan", mandatory: true, params: {} },
      { check_key: "udyam", mandatory: false, params: {} },
      { check_key: "debarment", mandatory: true, params: {} },
    ],
  },
  {
    id: "t2",
    ref_no: "GEM/2026/S/4419887",
    title: "Facility Management Services (2-yr)",
    buyer_org: "CPCL · Administration",
    category: "services",
    estimated_value: 11_000_000,
    status: "evaluating",
    created_at: "2026-09-05T09:00:00Z",
    bidder_count: 3,
    high_risk_count: 2,
    rule_summary: [
      "Turnover ≥ ₹80 L",
      "EPFO + ESIC mandatory",
      "GST returns current",
      "MSE preference: ON",
    ],
    requirements: [
      { check_key: "turnover", mandatory: true, params: { min_turnover: 8000000, years: 3 } },
      { check_key: "epfo", mandatory: true, params: {} },
      { check_key: "esic", mandatory: true, params: {} },
      { check_key: "gst", mandatory: true, params: {} },
      { check_key: "pan", mandatory: true, params: {} },
      { check_key: "debarment", mandatory: true, params: {} },
      { check_key: "cartel", mandatory: true, params: {} },
    ],
  },
  {
    id: "t3",
    ref_no: "GEM/2026/B/4423110",
    title: "Supply of IT Hardware (Workstations)",
    buyer_org: "CPCL · IT Services",
    category: "goods",
    estimated_value: 6_000_000,
    status: "evaluating",
    created_at: "2026-09-08T09:00:00Z",
    bidder_count: 2,
    high_risk_count: 1,
    rule_summary: [
      "MII Class-II",
      "BIS CRS",
      "Startup exemption allowed",
      "Debarment: strict",
    ],
    requirements: [
      { check_key: "mii", mandatory: true, params: { class: "II" } },
      { check_key: "bis", mandatory: true, params: { scheme: "CRS" } },
      { check_key: "startup", mandatory: false, params: {} },
      { check_key: "gst", mandatory: true, params: {} },
      { check_key: "pan", mandatory: true, params: {} },
      { check_key: "debarment", mandatory: true, params: {} },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bidders (9-cast) with identifiers
// ---------------------------------------------------------------------------
function bidder(
  id: string,
  legal_name: string,
  trade_name: string,
  constitution: string,
  pan: string,
  extra: Partial<Bidder> = {},
): Bidder {
  return {
    id,
    legal_name,
    trade_name,
    constitution,
    primary_pan: pan,
    claimed_flags: {},
    contact: {
      email: `contact@${trade_name.toLowerCase().replace(/[^a-z]/g, "")}.example`,
      phone: "+91 98•••• ••21",
      address: "Industrial Estate, Chennai, TN",
    },
    identifiers: [
      { kind: "PAN", value: pan, format_valid: true, source: "extracted" },
    ],
    ...extra,
  };
}

export const DEMO_BIDDERS: Record<string, Bidder> = {
  b1: bidder("b1", "Aarav Pumps Pvt Ltd", "Aarav Pumps", "Private Limited", "AAACA1234C", {
    claimed_flags: { mse_class: "Small", mii_class: "I" },
    identifiers: [
      { kind: "PAN", value: "AAACA1234C", format_valid: true, source: "portal" },
      { kind: "GSTIN", value: "33AAACA1234C1Z5", format_valid: true, source: "portal" },
      { kind: "UDYAM", value: "UDYAM-TN-01-0012345", format_valid: true, source: "portal" },
      { kind: "CIN", value: "U29120TN2016PTC101234", format_valid: true, source: "portal" },
      { kind: "BIS", value: "CM/L-7100045678", format_valid: true, source: "extracted" },
    ],
  }),
  b2: bidder("b2", "Bharat Micro Traders", "Bharat Micro", "Proprietorship", "BXXPB5678K", {
    claimed_flags: { mse_class: "Micro" },
    identifiers: [
      { kind: "PAN", value: "BXXPB5678K", format_valid: true, source: "extracted" },
      { kind: "GSTIN", value: "33BXXPB5678K1Z2", format_valid: true, source: "portal" },
      { kind: "UDYAM", value: "UDYAM-TN-02-0067890", format_valid: true, source: "extracted" },
    ],
  }),
  b3: bidder("b3", "Chola Infra LLP", "Chola Infra", "LLP", "AAECC9012D", {
    claimed_flags: { mii_class: "I", oem_brand: "HydroMax" },
    identifiers: [
      { kind: "PAN", value: "AAECC9012D", format_valid: true, source: "extracted" },
      { kind: "GSTIN", value: "33AAECC9012D1Z8", format_valid: true, source: "portal" },
      { kind: "CIN", value: "AAB-1234", format_valid: true, source: "portal" },
      { kind: "DIN", value: "07654321", format_valid: true, source: "portal" },
      { kind: "BIS", value: "CM/L-2200099887", format_valid: true, source: "extracted" },
    ],
  }),
  b4: bidder("b4", "Deccan Supplies", "Deccan", "Partnership", "AAGFD3456P", {
    identifiers: [
      { kind: "PAN", value: "AAGFD3456P", format_valid: true, source: "extracted" },
      { kind: "GSTIN", value: "33AAGFZ7788Q1Z0", format_valid: true, source: "portal" },
      { kind: "UDYAM", value: "UDYAM-TN-04-0033221", format_valid: true, source: "extracted" },
    ],
  }),
  b5: bidder("b5", "Everest Enterprises", "Everest", "Private Limited", "AADCE7788R", {
    claimed_flags: { experience_years: 5 },
    identifiers: [
      { kind: "PAN", value: "AADCE7788R", format_valid: true, source: "extracted" },
      { kind: "GSTIN", value: "33AADCE7788R1Z1", format_valid: true, source: "portal" },
      { kind: "CIN", value: "U74999TN2025PTC199888", format_valid: true, source: "portal" },
    ],
  }),
  b6: bidder("b6", "Falcon Services", "Falcon", "Private Limited", "AAFCF2211L", {
    identifiers: [
      { kind: "PAN", value: "AAFCF2211L", format_valid: true, source: "portal" },
      { kind: "GSTIN", value: "33AAFCF2211L1Z9", format_valid: true, source: "portal" },
      { kind: "DIN", value: "03344556", format_valid: true, source: "portal" },
    ],
  }),
  b7: bidder("b7", "Garuda Facilities", "Garuda", "Private Limited", "AAGCG8899M", {
    identifiers: [
      { kind: "PAN", value: "AAGCG8899M", format_valid: true, source: "portal" },
      { kind: "GSTIN", value: "33AAGCG8899M1Z4", format_valid: true, source: "portal" },
      { kind: "DIN", value: "03344556", format_valid: true, source: "portal" },
    ],
  }),
  b8: bidder("b8", "Hind Startup Labs Pvt Ltd", "Hind Startup", "Private Limited", "AAHCH4455N", {
    claimed_flags: { startup: true, dpiit: "DIPP45678" },
    identifiers: [
      { kind: "PAN", value: "AAHCH4455N", format_valid: true, source: "portal" },
      { kind: "GSTIN", value: "33AAHCH4455N1Z6", format_valid: true, source: "portal" },
      { kind: "DPIIT", value: "DIPP45678", format_valid: true, source: "portal" },
    ],
  }),
  b9: bidder("b9", "Indus Corp", "Indus", "Private Limited", "AAICI6677P", {
    identifiers: [
      { kind: "PAN", value: "AAICI6677P", format_valid: true, source: "portal" },
      { kind: "GSTIN", value: "33AAICI6677P1Z3", format_valid: true, source: "portal" },
      { kind: "DIN", value: "01928374", format_valid: true, source: "portal" },
    ],
  }),
};

// bid -> (tender, bidder, quoted value, ip/bank for cartel)
interface BidInfo {
  bidId: string;
  tenderId: string;
  bidderId: string;
  quoted: number;
  submittedAt: string;
  ip: string;
  bank: string;
}

export const DEMO_BIDS: BidInfo[] = [
  { bidId: "bid-b1", tenderId: "t1", bidderId: "b1", quoted: 30_400_000, submittedAt: T(9, 12), ip: "49.207.11.20", bank: "HDFC ••4501" },
  { bidId: "bid-b2", tenderId: "t1", bidderId: "b2", quoted: 31_800_000, submittedAt: T(9, 40), ip: "49.207.55.02", bank: "SBI ••7781" },
  { bidId: "bid-b3", tenderId: "t1", bidderId: "b3", quoted: 29_950_000, submittedAt: T(9, 55), ip: "103.21.44.7", bank: "ICICI ••3320" },
  { bidId: "bid-b4", tenderId: "t1", bidderId: "b4", quoted: 30_100_000, submittedAt: T(10, 2), ip: "103.21.44.9", bank: "Axis ••9987" },
  { bidId: "bid-b5", tenderId: "t2", bidderId: "b5", quoted: 10_600_000, submittedAt: T(8, 30), ip: "45.118.9.14", bank: "Kotak ••1122" },
  { bidId: "bid-b6", tenderId: "t2", bidderId: "b6", quoted: 9_820_000, submittedAt: T(8, 44), ip: "182.72.30.5", bank: "Union ••6410" },
  { bidId: "bid-b7", tenderId: "t2", bidderId: "b7", quoted: 9_840_000, submittedAt: T(8, 45), ip: "182.72.30.5", bank: "Union ••6410" },
  { bidId: "bid-b8", tenderId: "t3", bidderId: "b8", quoted: 5_600_000, submittedAt: T(9, 5), ip: "157.32.18.90", bank: "YES ••2255" },
  { bidId: "bid-b9", tenderId: "t3", bidderId: "b9", quoted: 5_480_000, submittedAt: T(9, 18), ip: "157.32.90.4", bank: "PNB ••8833" },
];

// ---------------------------------------------------------------------------
// Check builder
// ---------------------------------------------------------------------------
let evSeq = 0;
function ev(
  kind: Evidence["kind"],
  label: string,
  source: string,
  method: string,
  payload: Record<string, unknown> = {},
): Evidence {
  evSeq += 1;
  return {
    id: `ev-${evSeq.toString().padStart(4, "0")}`,
    kind,
    label,
    source,
    method,
    observed_at: NOW,
    payload,
  };
}

interface CheckSpec {
  verdict: Verdict;
  summary: string;
  source: string;
  method: string;
  mode: ProviderMode;
  confidence?: number;
  is_veto?: boolean;
  evidence?: Evidence[];
  comparisons?: CheckResult["comparisons"];
}

function mkCheck(key: CheckKey, spec: CheckSpec): CheckResult {
  return {
    key,
    dimension: CHECK_META[key].dimension,
    verdict: spec.verdict,
    confidence: spec.confidence ?? 0.95,
    summary: spec.summary,
    source: spec.source,
    method: spec.method,
    observed_at: NOW,
    mode: spec.mode,
    is_veto: spec.is_veto ?? false,
    evidence: spec.evidence ?? [],
    comparisons: spec.comparisons,
  };
}

// Common "healthy" checks reused for clean bidders
const okPan = (name: string): CheckResult =>
  mkCheck("pan", {
    verdict: "PASS",
    summary: `PAN active; category matches ${name}; Aadhaar-linked.`,
    source: "NSDL / Income-Tax (sandbox)",
    method: "api-live",
    mode: "LIVE",
    confidence: 0.99,
    evidence: [ev("portal_response", "PAN status: VALID · Aadhaar: LINKED", "Income-Tax", "api-live", { status: "VALID", aadhaar: "LINKED" })],
  });

const okGst = (gstin: string): CheckResult =>
  mkCheck("gst", {
    verdict: "PASS",
    summary: "GSTIN active; 12/12 recent returns filed.",
    source: "GSTN (sandbox)",
    method: "api-live",
    mode: "LIVE",
    confidence: 0.98,
    evidence: [ev("portal_response", "GSTIN status: Active · GSTR-3B 12/12 filed", "GSTN", "api-live", { gstin, status: "Active", returns_filed: 12 })],
  });

// ---------------------------------------------------------------------------
// Per-bidder check sets (planted frauds)
// ---------------------------------------------------------------------------
const CHECKS: Record<string, CheckResult[]> = {
  // B1 · clean baseline (LOW)
  b1: [
    mkCheck("debarment", { verdict: "PASS", summary: "No match in World Bank / CPPP snapshots.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Legal name consistent across PAN, GST, Udyam, MCA.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "PASS", summary: "Company active since 2016; directors in good standing.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAACA1234C1Z5"),
    mkCheck("turnover", { verdict: "PASS", summary: "3-yr avg turnover ₹6.1 Cr ≥ ₹2 Cr threshold.", source: "CA certificate + GSTR", method: "ocr+rule", mode: "SIMULATED" }),
    mkCheck("udyam", { verdict: "PASS", summary: "Udyam valid; Small classification consistent with turnover.", source: "Udyam portal", method: "api-live", mode: "LIVE" }),
    mkCheck("mii", { verdict: "PASS", summary: "MII Class-I: local content 62% (self-cert + CA).", source: "MII declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("oem", { verdict: "PASS", summary: "OEM (self-manufactured); MAF not required.", source: "OEM declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("bis", { verdict: "PASS", summary: "BIS licence CM/L-7100045678 valid for pumps.", source: "BIS portal", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "PASS", summary: "All certificates DigiLocker issuer-signed; no tampering.", source: "DigiLocker", method: "issuer-signed", mode: "LIVE" }),
    mkCheck("experience", { verdict: "PASS", summary: "8 years supply history; 3 comparable POs verified.", source: "Purchase orders", method: "ocr", mode: "SIMULATED" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No shared director/address/bank/IP with co-bidders.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B2 · Micro claim inconsistent + name mismatch (MEDIUM)
  b2: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Proprietorship"),
    mkCheck("name_reconcile", {
      verdict: "WARN",
      summary: "Udyam name 'Bharat Micro Trading Co.' ≠ PAN name 'Bharat Micro Traders' (fuzzy 0.78).",
      source: "Cross-portal", method: "fuzzy-match", mode: "SIMULATED", confidence: 0.78,
      comparisons: [
        { field: "Legal name", declared: "Bharat Micro Traders", pan: "Bharat Micro Traders", gst: "Bharat Micro Traders", udyam: "Bharat Micro Trading Co.", match_score: 0.78 },
      ],
      evidence: [ev("document_field", "Udyam name differs from PAN name", "Udyam certificate", "ocr", { pan_name: "Bharat Micro Traders", udyam_name: "Bharat Micro Trading Co." })],
    }),
    mkCheck("gst", { verdict: "PASS", summary: "GSTIN active; 11/12 returns filed (1 late).", source: "GSTN (sandbox)", method: "api-live", mode: "LIVE" }),
    mkCheck("turnover", { verdict: "WARN", summary: "Turnover ₹4.8 Cr inconsistent with 'Micro' (< ₹5 Cr limit is for turnover, but investment/scale flagged).", source: "GSTR aggregate", method: "rule", mode: "SIMULATED" }),
    mkCheck("udyam", {
      verdict: "WARN",
      summary: "Claims Micro; GST turnover scale suggests Small. Classification review needed.",
      source: "Udyam portal", method: "api-live+rule", mode: "LIVE",
      evidence: [ev("rule", "Micro cap vs observed turnover", "MSME rule", "rule", { claimed: "Micro", observed_turnover: 48000000 })],
    }),
    mkCheck("mii", { verdict: "PASS", summary: "MII Class-I self-declared; supporting docs present.", source: "MII declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("oem", { verdict: "PASS", summary: "Authorized reseller; MAF valid.", source: "MAF", method: "ocr", mode: "SIMULATED" }),
    mkCheck("bis", { verdict: "PASS", summary: "BIS licence valid for product.", source: "BIS portal", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "PASS", summary: "Documents uploaded; forensics clean.", source: "Forensics", method: "metadata+ELA", mode: "SIMULATED" }),
    mkCheck("experience", { verdict: "PASS", summary: "5 years trading history.", source: "Purchase orders", method: "ocr", mode: "SIMULATED" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No related-party links.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B3 · Forged/expired OEM MAF + BIS belongs to another brand (HIGH)
  b3: [
    mkCheck("debarment", { verdict: "PASS", summary: "Firm clean; note: one director appears in a separate debarment record (see MCA).", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("LLP"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent across portals.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "WARN", summary: "LLP active; a designated partner (DIN 07654321) flagged on a debarment snapshot.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAECC9012D1Z8"),
    mkCheck("turnover", { verdict: "PASS", summary: "3-yr avg ₹3.4 Cr ≥ threshold.", source: "CA certificate", method: "ocr", mode: "SIMULATED" }),
    mkCheck("mii", { verdict: "WARN", summary: "Class-I claimed on partly imported assembly; LC evidence weak.", source: "MII declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("oem", {
      verdict: "FAIL", is_veto: true,
      summary: "OEM MAF is FORGED · signature block edited after signing (PDF incremental update) and validity expired 2025-03-31.",
      source: "MAF (uploaded)", method: "forensic+ocr", mode: "SIMULATED", confidence: 0.93,
      evidence: [
        ev("forensic", "PDF incremental update after signature (tamper)", "Document forensics", "incremental-update", { updates: 2, after_signature: true }),
        ev("document_field", "MAF validity expired 31 Mar 2025", "MAF", "ocr", { valid_to: "2025-03-31" }),
        ev("forensic", "ELA highlights edited signature region", "Document forensics", "ELA", { region: "signature-block", note: "ELA heatmap shows recompression around signature" }),
      ],
    }),
    mkCheck("bis", {
      verdict: "FAIL",
      summary: "BIS licence CM/L-2200099887 is registered to brand 'AquaPro', not the quoted 'HydroMax'.",
      source: "BIS portal", method: "api-live", mode: "LIVE",
      evidence: [ev("portal_response", "BIS holder = AquaPro ≠ quoted HydroMax", "BIS", "api-live", { licence_holder: "AquaPro Industries", quoted_brand: "HydroMax" })],
    }),
    mkCheck("digilocker", {
      verdict: "FAIL", is_veto: true,
      summary: "Uploaded MAF fails forensic integrity · tamper detected.",
      source: "Document forensics", method: "metadata+ELA+copy-move", mode: "SIMULATED",
      evidence: [ev("forensic", "Copy-move seal detected; metadata author mismatch", "Forensics", "copy-move", { regions: 1, author_before: "HydroMax Ltd", author_after: "unknown" })],
    }),
    mkCheck("experience", { verdict: "PASS", summary: "4 years reseller history.", source: "POs", method: "ocr", mode: "SIMULATED" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No cartel links in this tender.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B4 · PAN on GST ≠ PAN on Udyam + GST cancelled (HIGH)
  b4: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    mkCheck("pan", {
      verdict: "FAIL", is_veto: true,
      summary: "Identity fraud · PAN embedded in GSTIN (AAGFZ7788Q) ≠ PAN on Udyam/declared (AAGFD3456P).",
      source: "Cross-portal", method: "join-key", mode: "SIMULATED", confidence: 0.97,
      comparisons: [
        { field: "PAN", declared: "AAGFD3456P", pan: "AAGFD3456P", gst: "AAGFZ7788Q", udyam: "AAGFD3456P", match_score: 0.0 },
      ],
      evidence: [ev("portal_response", "GSTIN PAN-segment ≠ declared PAN", "GSTN + Udyam", "join-key", { gst_pan: "AAGFZ7788Q", declared_pan: "AAGFD3456P" })],
    }),
    mkCheck("name_reconcile", { verdict: "FAIL", summary: "Entity behind GSTIN differs from declared entity (PAN mismatch).", source: "Cross-portal", method: "join-key", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "NOT_APPLICABLE", summary: "Partnership · no CIN.", source: "MCA21", method: "n/a", mode: "SIMULATED" }),
    mkCheck("gst", {
      verdict: "FAIL", is_veto: true,
      summary: "GSTIN status CANCELLED (suo-moto) w.e.f. 2026-06-30; 4 returns unfiled.",
      source: "GSTN (sandbox)", method: "api-live", mode: "LIVE", confidence: 0.99,
      evidence: [ev("portal_response", "GSTIN status: Cancelled", "GSTN", "api-live", { status: "Cancelled", cancelled_on: "2026-06-30", returns_pending: 4 })],
    }),
    mkCheck("turnover", { verdict: "UNVERIFIABLE", summary: "Cannot verify · GST cancelled, CA certificate not issuer-signed.", source: "GSTR", method: "api-live", mode: "LIVE" }),
    mkCheck("udyam", { verdict: "WARN", summary: "Udyam present but tied to a different PAN · needs manual reconciliation.", source: "Udyam portal", method: "api-live", mode: "LIVE" }),
    mkCheck("mii", { verdict: "NOT_APPLICABLE", summary: "Not evaluated pending identity resolution.", source: "-", method: "n/a", mode: "SIMULATED" }),
    mkCheck("bis", { verdict: "UNVERIFIABLE", summary: "BIS portal timeout; retry recommended.", source: "BIS portal", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "WARN", summary: "Documents uploaded (not DigiLocker); GST cert PDF metadata inconsistent.", source: "Forensics", method: "metadata", mode: "SIMULATED" }),
    mkCheck("experience", { verdict: "UNVERIFIABLE", summary: "Records unverifiable pending identity.", source: "-", method: "n/a", mode: "SIMULATED" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No related-party links found.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B5 · shell / recent CIN vs claimed vintage; no EPFO/ESIC (HIGH)
  b5: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent across portals.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", {
      verdict: "WARN",
      summary: "Shell signal · CIN incorporated 2025 but bid claims 5-yr experience.",
      source: "MCA21", method: "api-live", mode: "LIVE",
      evidence: [ev("portal_response", "Incorporation year 2025 vs claimed 5-yr experience", "MCA21", "api-live", { incorporated: 2025, claimed_experience_years: 5 })],
    }),
    okGst("33AADCE7788R1Z1"),
    mkCheck("turnover", { verdict: "WARN", summary: "Only 1 year of filings available (new entity).", source: "GSTR", method: "rule", mode: "SIMULATED" }),
    mkCheck("udyam", { verdict: "NOT_APPLICABLE", summary: "Not claimed.", source: "-", method: "n/a", mode: "SIMULATED" }),
    mkCheck("epfo", {
      verdict: "FAIL",
      summary: "No EPFO establishment code found · required for a services contract of this size.",
      source: "EPFO (mock)", method: "api-mock", mode: "SIMULATED",
      evidence: [ev("portal_response", "No active EPFO code", "EPFO", "api-mock", { found: false })],
    }),
    mkCheck("esic", { verdict: "FAIL", summary: "No ESIC registration · mandatory for this tender.", source: "ESIC (mock)", method: "api-mock", mode: "SIMULATED" }),
    mkCheck("gst", { verdict: "PASS", summary: "GSTIN active (registered 2025).", source: "GSTN (sandbox)", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "PASS", summary: "Documents forensically clean.", source: "Forensics", method: "metadata+ELA", mode: "SIMULATED" }),
    mkCheck("experience", {
      verdict: "FAIL",
      summary: "Claimed 5 yrs experience not supported · entity < 1 yr old.",
      source: "MCA + POs", method: "rule", mode: "SIMULATED",
      evidence: [ev("rule", "Experience claim exceeds entity age", "Rule engine", "rule", { entity_age_years: 0.7, claimed: 5 })],
    }),
    mkCheck("cartel", { verdict: "PASS", summary: "No related-party links.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B6 · cartel (HIGH)
  b6: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "WARN", summary: "Director DIN 03344556 shared with co-bidder Garuda Facilities.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAFCF2211L1Z9"),
    mkCheck("turnover", { verdict: "PASS", summary: "Turnover ₹1.2 Cr ≥ ₹80 L.", source: "GSTR", method: "rule", mode: "SIMULATED" }),
    mkCheck("epfo", { verdict: "PASS", summary: "EPFO code active.", source: "EPFO (mock)", method: "api-mock", mode: "SIMULATED" }),
    mkCheck("esic", { verdict: "PASS", summary: "ESIC code active.", source: "ESIC (mock)", method: "api-mock", mode: "SIMULATED" }),
    mkCheck("cartel", {
      verdict: "FAIL", is_veto: true,
      summary: "Cartel signal · shares director (DIN 03344556), bank (Union ••6410) and submission IP (182.72.30.5) with Garuda Facilities; near-identical pricing.",
      source: "Entity graph", method: "graph", mode: "SIMULATED", confidence: 0.9,
      evidence: [
        ev("graph", "Shared DIN 03344556 with Garuda", "Entity graph", "graph", { relation: "same_director", peer: "Garuda Facilities" }),
        ev("graph", "Shared bank + submission IP", "Entity graph", "graph", { bank: "Union ••6410", ip: "182.72.30.5" }),
        ev("rule", "Quote delta 0.2% vs Garuda", "Pricing analysis", "rule", { falcon: 9820000, garuda: 9840000 }),
      ],
    }),
    mkCheck("digilocker", { verdict: "PASS", summary: "Documents clean.", source: "Forensics", method: "metadata", mode: "SIMULATED" }),
    mkCheck("experience", { verdict: "PASS", summary: "6 years services history.", source: "POs", method: "ocr", mode: "SIMULATED" }),
  ],

  // B7 · cartel (HIGH)
  b7: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "WARN", summary: "Director DIN 03344556 shared with co-bidder Falcon Services.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAGCG8899M1Z4"),
    mkCheck("turnover", { verdict: "PASS", summary: "Turnover ₹1.1 Cr ≥ ₹80 L.", source: "GSTR", method: "rule", mode: "SIMULATED" }),
    mkCheck("epfo", { verdict: "PASS", summary: "EPFO code active.", source: "EPFO (mock)", method: "api-mock", mode: "SIMULATED" }),
    mkCheck("esic", { verdict: "PASS", summary: "ESIC code active.", source: "ESIC (mock)", method: "api-mock", mode: "SIMULATED" }),
    mkCheck("cartel", {
      verdict: "FAIL", is_veto: true,
      summary: "Cartel signal · shares director, bank and submission IP with Falcon Services; near-identical pricing.",
      source: "Entity graph", method: "graph", mode: "SIMULATED", confidence: 0.9,
      evidence: [
        ev("graph", "Shared DIN 03344556 with Falcon", "Entity graph", "graph", { relation: "same_director", peer: "Falcon Services" }),
        ev("graph", "Shared bank + submission IP", "Entity graph", "graph", { bank: "Union ••6410", ip: "182.72.30.5" }),
      ],
    }),
    mkCheck("digilocker", { verdict: "PASS", summary: "Documents clean.", source: "Forensics", method: "metadata", mode: "SIMULATED" }),
    mkCheck("experience", { verdict: "PASS", summary: "5 years services history.", source: "POs", method: "ocr", mode: "SIMULATED" }),
  ],

  // B8 · startup scope WARN (MEDIUM)
  b8: [
    mkCheck("debarment", { verdict: "PASS", summary: "No debarment match.", source: "CPPP snapshot", method: "snapshot", mode: "SNAPSHOT" }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "PASS", summary: "Company active; directors in good standing.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAHCH4455N1Z6"),
    mkCheck("turnover", { verdict: "PASS", summary: "Turnover within startup limits.", source: "GSTR", method: "rule", mode: "SIMULATED" }),
    mkCheck("startup", {
      verdict: "WARN",
      summary: "DPIIT recognition valid, but exemption claimed on a RESOLD (non-innovative) item · scope check advised.",
      source: "DPIIT portal", method: "api-mock+rule", mode: "SIMULATED",
      evidence: [ev("rule", "Exemption scope vs offered item", "Startup rule", "rule", { dpiit: "DIPP45678", item: "resold workstation", innovative: false })],
    }),
    mkCheck("mii", { verdict: "PASS", summary: "MII Class-II satisfied.", source: "MII declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("bis", { verdict: "PASS", summary: "BIS CRS registration valid.", source: "BIS portal", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "PASS", summary: "DigiLocker issuer-signed docs; clean.", source: "DigiLocker", method: "issuer-signed", mode: "LIVE" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No related-party links.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],

  // B9 · debarment veto (HIGH)
  b9: [
    mkCheck("debarment", {
      verdict: "FAIL", is_veto: true,
      summary: "Director DIN 01928374 matches CPPP debarred list (fuzzy 0.96); firm PAN also on World Bank snapshot.",
      source: "CPPP snapshot", method: "snapshot+fuzzy", mode: "SNAPSHOT", confidence: 0.96,
      evidence: [
        ev("portal_response", "DIN 01928374 = debarred director (CPPP)", "CPPP snapshot", "snapshot", { din: "01928374", match: 0.96 }),
        ev("portal_response", "Firm on World Bank debarred-firms snapshot", "World Bank", "snapshot", { entity: "Indus Corp", period: "2024-2027" }),
      ],
    }),
    okPan("Private Limited"),
    mkCheck("name_reconcile", { verdict: "PASS", summary: "Name consistent across portals.", source: "Cross-portal", method: "compute", mode: "SIMULATED" }),
    mkCheck("mca", { verdict: "WARN", summary: "Company active; a director appears on debarment snapshot.", source: "MCA21", method: "api-live", mode: "LIVE" }),
    okGst("33AAICI6677P1Z3"),
    mkCheck("turnover", { verdict: "PASS", summary: "Turnover ₹2.9 Cr ≥ threshold.", source: "GSTR", method: "rule", mode: "SIMULATED" }),
    mkCheck("mii", { verdict: "PASS", summary: "MII Class-II satisfied.", source: "MII declaration", method: "rule", mode: "SIMULATED" }),
    mkCheck("bis", { verdict: "PASS", summary: "BIS CRS valid.", source: "BIS portal", method: "api-live", mode: "LIVE" }),
    mkCheck("digilocker", { verdict: "PASS", summary: "Documents clean.", source: "Forensics", method: "metadata", mode: "SIMULATED" }),
    mkCheck("experience", { verdict: "PASS", summary: "7 years supply history.", source: "POs", method: "ocr", mode: "SIMULATED" }),
    mkCheck("cartel", { verdict: "PASS", summary: "No related-party links.", source: "Entity graph", method: "graph", mode: "SIMULATED" }),
  ],
};

// ---------------------------------------------------------------------------
// Scoring + recommendation derivation
// ---------------------------------------------------------------------------
const CREDIT: Record<Verdict, number | null> = {
  PASS: 1,
  WARN: 0.5,
  FAIL: 0,
  NOT_APPLICABLE: null,
  UNVERIFIABLE: null,
};

function scoreFor(bidderId: string): ComplianceScore {
  const checks = CHECKS[bidderId];
  const byDim: Record<string, { num: number; den: number; weight: number }> = {};
  for (const key of Object.keys(DIMENSION_WEIGHTS)) {
    byDim[key] = { num: 0, den: 0, weight: DIMENSION_WEIGHTS[key as keyof typeof DIMENSION_WEIGHTS] };
  }
  const vetoes = [] as ComplianceScore["vetoes"];
  for (const c of checks) {
    const credit = CREDIT[c.verdict];
    if (credit !== null) {
      byDim[c.dimension].num += credit;
      byDim[c.dimension].den += 1;
    }
    if (c.is_veto) {
      vetoes.push({ key: c.key, why: c.summary, evidence: c.evidence.map((e) => e.id) });
    }
  }
  let total = 0;
  let wsum = 0;
  const dimensions = Object.keys(byDim).map((dim) => {
    const d = byDim[dim];
    const s = d.den > 0 ? d.num / d.den : 1;
    total += s * d.weight;
    wsum += d.weight;
    return {
      name: DIMENSION_LABELS[dim as keyof typeof DIMENSION_LABELS],
      dimension: dim as ComplianceScore["dimensions"][number]["dimension"],
      weight: d.weight,
      score: s,
      vetoes: vetoes.filter((v) => CHECK_META[v.key].dimension === dim),
    };
  });
  let score = Math.round((total / wsum) * 100);
  if (vetoes.length > 0) score = Math.min(score, 32); // veto caps into HIGH
  const band: RiskBand = score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH";

  const reasons_top: string[] = [];
  for (const v of vetoes) reasons_top.push(`VETO: ${CHECK_META[v.key].short} · ${shortWhy(v.why)}`);
  for (const c of checks) {
    if (reasons_top.length >= 5) break;
    if (c.verdict === "WARN") reasons_top.push(`WARN: ${CHECK_META[c.key].short} · ${shortWhy(c.summary)}`);
  }
  for (const c of checks) {
    if (reasons_top.length >= 5) break;
    if (c.verdict === "UNVERIFIABLE") reasons_top.push(`UNVERIFIABLE: ${CHECK_META[c.key].short}`);
  }
  if (reasons_top.length === 0) reasons_top.push("All mandatory checks passed");

  return { score, band, dimensions, vetoes, reasons_top };
}

function shortWhy(s: string): string {
  const first = s.split(/[.;-]/)[0].trim();
  return first.length > 64 ? `${first.slice(0, 61)}…` : first;
}

function recommendationFor(bidderId: string, score: ComplianceScore): Recommendation {
  let stance: RecommendationStance;
  let rationale: string;
  if (score.vetoes.length > 0) {
    stance = "RECOMMEND_DISQUALIFY";
    rationale = `For the officer's consideration: ${score.vetoes.length} hard veto(es) detected (${score.vetoes
      .map((v) => CHECK_META[v.key].short)
      .join(", ")}). Statutory / integrity failure indicates the bid does not meet mandatory eligibility. Evidence is attached for each finding.`;
  } else if (score.band === "MEDIUM") {
    stance = "FURTHER_SCRUTINY";
    rationale =
      "For the officer's consideration: eligibility is largely met but one or more warnings require manual confirmation before award. No hard veto was triggered.";
  } else {
    stance = "RECOMMEND_QUALIFY";
    rationale =
      "For the officer's consideration: all mandatory checks passed with high confidence and no adverse signals. The bid appears compliant.";
  }
  return {
    stance,
    rationale,
    evidence_refs: CHECKS[bidderId].flatMap((c) => c.evidence.map((e) => e.id)).slice(0, 6),
    model_meta: { provider: "Heuristic (offline)", model: "pramaan-rules-v1", mode: "SIMULATED" },
  };
}

// ---------------------------------------------------------------------------
// Documents per bidder
// ---------------------------------------------------------------------------
function docsFor(bidderId: string): DocumentRecord[] {
  const base = (
    type: string,
    label: string,
    conf: number,
    forensic: DocumentRecord["forensics"],
    source: DocumentRecord["source"] = "uploaded",
  ): DocumentRecord => ({
    id: `doc-${bidderId}-${type}`,
    bidder_id: bidderId,
    doc_type: type,
    file_hash: `sha256:${bidderId}${type}`.padEnd(20, "0"),
    source,
    extraction_confidence: conf,
    extracted: {},
    forensics: forensic,
    thumbnail_label: label,
  });
  const clean: DocumentRecord["forensics"] = { verdict: "PASS", summary: "No tampering indicators." };
  if (bidderId === "b3") {
    return [
      base("udyam_cert", "Udyam Certificate", 0.97, clean, "digilocker"),
      base("gst_cert", "GST Certificate", 0.96, clean, "digilocker"),
      base("maf", "OEM MAF (HydroMax)", 0.71, {
        verdict: "FAIL",
        summary: "Incremental update after signature; ELA anomaly at signature; validity expired.",
        incremental_updates: 2,
        copy_move_regions: 1,
        ela_note: "ELA heatmap shows recompression around the signature block · consistent with post-sign editing.",
        metadata_diff: [
          { field: "Author", before: "HydroMax Ltd", after: "unknown" },
          { field: "ModDate", before: "2024-11-02", after: "2026-09-10" },
          { field: "Producer", before: "Adobe PDF Library", after: "PDFsharp" },
        ],
      }),
      base("bis_cert", "BIS Certificate", 0.9, {
        verdict: "WARN",
        summary: "Licence genuine but registered to a different brand (AquaPro).",
      }),
    ];
  }
  if (bidderId === "b4") {
    return [
      base("gst_cert", "GST Certificate", 0.72, {
        verdict: "WARN",
        summary: "PDF metadata inconsistent with issuer template; GSTIN shows cancelled status on portal.",
        metadata_diff: [
          { field: "Producer", before: "GSTN e-portal", after: "Microsoft Word" },
        ],
      }),
      base("udyam_cert", "Udyam Certificate", 0.88, {
        verdict: "WARN",
        summary: "PAN on Udyam differs from PAN embedded in GSTIN.",
      }),
      base("pan_card", "PAN Card", 0.94, clean),
    ];
  }
  return [
    base("udyam_cert", "Udyam Certificate", 0.97, clean, bidderId === "b1" || bidderId === "b8" ? "digilocker" : "uploaded"),
    base("gst_cert", "GST Certificate", 0.98, clean, "digilocker"),
    base("pan_card", "PAN Card", 0.99, clean),
    base("turnover_cert", "CA Turnover Certificate", 0.93, clean),
  ];
}

// ---------------------------------------------------------------------------
// Build verdicts for all bids
// ---------------------------------------------------------------------------
function buildVerdict(bid: BidInfo): BidVerdict {
  const bidder = DEMO_BIDDERS[bid.bidderId];
  const tender = DEMO_TENDERS.find((t) => t.id === bid.tenderId)!;
  const checks = CHECKS[bid.bidderId];
  const score = scoreFor(bid.bidderId);
  const recommendation = recommendationFor(bid.bidderId, score);
  const started = bid.submittedAt;
  const finished = new Date(new Date(started).getTime() + 88_000).toISOString();
  const decision =
    bid.bidderId === "b1"
      ? {
          id: `dec-${bid.bidId}`,
          outcome: "QUALIFIED" as const,
          note: "All mandatory checks passed; documents DigiLocker-signed. Cleared for financial evaluation.",
          officer_name: "R. Meenakshi",
          decided_at: T(11, 5),
        }
      : null;
  return {
    bid: {
      id: bid.bidId,
      tender_id: bid.tenderId,
      bidder_id: bid.bidderId,
      quoted_value: bid.quoted,
      submitted_at: bid.submittedAt,
    },
    bidder,
    tender: { id: tender.id, ref_no: tender.ref_no, title: tender.title, buyer_org: tender.buyer_org },
    run: {
      run_id: `run-${bid.bidId}`,
      bid_id: bid.bidId,
      bidder_id: bid.bidderId,
      tender_id: bid.tenderId,
      status: "complete",
      provider_mode: "mixed",
      started_at: started,
      finished_at: finished,
      duration_seconds: 88,
      checks,
    },
    score,
    recommendation,
    documents: docsFor(bid.bidderId),
    decision,
  };
}

export const DEMO_VERDICTS: Record<string, BidVerdict> = Object.fromEntries(
  DEMO_BIDS.map((b) => [b.bidId, buildVerdict(b)]),
);

// map bidderId -> bidId for convenience routing
export const BIDDER_TO_BID: Record<string, string> = Object.fromEntries(
  DEMO_BIDS.map((b) => [b.bidderId, b.bidId]),
);

// ---------------------------------------------------------------------------
// Comparison matrices per tender
// ---------------------------------------------------------------------------
export function comparisonFor(tenderId: string): ComparisonMatrix {
  const bids = DEMO_BIDS.filter((b) => b.tenderId === tenderId);
  const checkKeys = Array.from(
    bids.reduce((set, b) => {
      for (const c of CHECKS[b.bidderId]) set.add(c.key);
      return set;
    }, new Set<CheckKey>()),
  );
  const rows: ComparisonRow[] = bids
    .map((b) => {
      const v = DEMO_VERDICTS[b.bidId];
      const cellMap = new Map(v.run.checks.map((c) => [c.key, c]));
      return {
        bid_id: b.bidId,
        bidder_id: b.bidderId,
        bidder_name: DEMO_BIDDERS[b.bidderId].legal_name,
        cells: checkKeys.map((k) => {
          const c = cellMap.get(k);
          return {
            key: k,
            verdict: (c?.verdict ?? "NOT_APPLICABLE") as Verdict,
            is_veto: c?.is_veto ?? false,
          };
        }),
        score: v.score.score,
        band: v.score.band,
        recommendation: v.recommendation.stance,
      };
    })
    .sort((a, b) => b.score - a.score);
  return { tender_id: tenderId, check_keys: checkKeys, rows };
}

// ---------------------------------------------------------------------------
// Entity graph (T2 cartel view: Falcon + Garuda)
// ---------------------------------------------------------------------------
export function graphFor(tenderId: string): EntityGraph {
  if (tenderId === "t2") {
    return {
      nodes: [
        { id: "b5", type: "bidder", value: "Everest Enterprises", label: "Everest Enterprises", cluster: null },
        { id: "b6", type: "bidder", value: "Falcon Services", label: "Falcon Services", cluster: "c1" },
        { id: "b7", type: "bidder", value: "Garuda Facilities", label: "Garuda Facilities", cluster: "c1" },
        { id: "din-03344556", type: "din", value: "03344556", label: "DIN 03344556", cluster: "c1" },
        { id: "bank-union6410", type: "bank", value: "Union ••6410", label: "Bank Union ••6410", cluster: "c1" },
        { id: "ip-182", type: "ip", value: "182.72.30.5", label: "IP 182.72.30.5", cluster: "c1" },
        { id: "addr-annanagar", type: "address", value: "12 Anna Nagar, Chennai", label: "Addr Anna Nagar", cluster: "c1" },
        { id: "din-99001", type: "din", value: "09900112", label: "DIN 09900112", cluster: null },
        { id: "bank-kotak1122", type: "bank", value: "Kotak ••1122", label: "Bank Kotak ••1122", cluster: null },
      ],
      edges: [
        { source: "b6", target: "din-03344556", relation: "has_director", weight: 1 },
        { source: "b7", target: "din-03344556", relation: "has_director", weight: 1 },
        { source: "b6", target: "bank-union6410", relation: "uses_bank", weight: 1 },
        { source: "b7", target: "bank-union6410", relation: "uses_bank", weight: 1 },
        { source: "b6", target: "ip-182", relation: "submitted_from", weight: 1 },
        { source: "b7", target: "ip-182", relation: "submitted_from", weight: 1 },
        { source: "b6", target: "addr-annanagar", relation: "registered_at", weight: 0.8 },
        { source: "b7", target: "addr-annanagar", relation: "registered_at", weight: 0.8 },
        { source: "b5", target: "din-99001", relation: "has_director", weight: 1 },
        { source: "b5", target: "bank-kotak1122", relation: "uses_bank", weight: 1 },
      ],
      clusters: [
        {
          id: "c1",
          bidder_ids: ["b6", "b7"],
          reason: "Shared director (DIN 03344556) + bank (Union ••6410) + submission IP (182.72.30.5) + address; near-identical pricing.",
          severity: "high",
        },
      ],
    };
  }
  if (tenderId === "t1") {
    return {
      nodes: [
        { id: "b1", type: "bidder", value: "Aarav Pumps", label: "Aarav Pumps", cluster: null },
        { id: "b2", type: "bidder", value: "Bharat Micro", label: "Bharat Micro", cluster: null },
        { id: "b3", type: "bidder", value: "Chola Infra", label: "Chola Infra", cluster: null },
        { id: "b4", type: "bidder", value: "Deccan Supplies", label: "Deccan Supplies", cluster: null },
        { id: "pan-b1", type: "pan", value: "AAACA1234C", label: "PAN AAA••34C", cluster: null },
        { id: "pan-b4a", type: "pan", value: "AAGFD3456P", label: "PAN AAG••56P (declared)", cluster: "c2" },
        { id: "pan-b4b", type: "pan", value: "AAGFZ7788Q", label: "PAN AAG••88Q (in GSTIN)", cluster: "c2" },
      ],
      edges: [
        { source: "b1", target: "pan-b1", relation: "has_pan", weight: 1 },
        { source: "b4", target: "pan-b4a", relation: "declared_pan", weight: 1 },
        { source: "b4", target: "pan-b4b", relation: "gstin_pan", weight: 1 },
      ],
      clusters: [
        {
          id: "c2",
          bidder_ids: ["b4"],
          reason: "Two conflicting PANs bound to one bidder · identity inconsistency between declared PAN and GSTIN PAN segment.",
          severity: "high",
        },
      ],
    };
  }
  return {
    nodes: [
      { id: "b8", type: "bidder", value: "Hind Startup Labs", label: "Hind Startup Labs", cluster: null },
      { id: "b9", type: "bidder", value: "Indus Corp", label: "Indus Corp", cluster: "c3" },
      { id: "din-b9", type: "din", value: "01928374", label: "DIN 01928374 (debarred)", cluster: "c3" },
    ],
    edges: [{ source: "b9", target: "din-b9", relation: "has_director", weight: 1 }],
    clusters: [
      { id: "c3", bidder_ids: ["b9"], reason: "Director DIN present on CPPP debarment snapshot.", severity: "high" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Debarment snapshot dataset
// ---------------------------------------------------------------------------
export const DEMO_DEBARMENT: DebarmentRecord[] = [
  {
    id: "deb-1",
    source: "cppp",
    entity_name: "Indus Corp",
    pan: "AAICI6677P",
    cin: null,
    din: "01928374",
    grounds: "Submission of fraudulent documents in a public tender (Rule 151, GFR).",
    from_date: "2024-05-01",
    to_date: "2027-04-30",
    captured_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "deb-2",
    source: "worldbank",
    entity_name: "Indus Corporation (India)",
    pan: "AAICI6677P",
    cin: null,
    din: null,
    grounds: "Fraudulent practice under World Bank sanctions framework.",
    from_date: "2024-02-15",
    to_date: "2027-02-14",
    captured_at: "2026-08-20T00:00:00Z",
  },
  {
    id: "deb-3",
    source: "cppp",
    entity_name: "Kaveri Designated Partner (Chola Infra LLP)",
    pan: null,
    cin: null,
    din: "07654321",
    grounds: "Debarred as director in a separate matter; period active.",
    from_date: "2025-01-01",
    to_date: "2026-12-31",
    captured_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "deb-4",
    source: "ministry",
    entity_name: "Vindhya Steel Traders",
    pan: "AABCV1111X",
    cin: "U27100MH2019PTC300111",
    din: null,
    grounds: "Breach of contract; performance default on prior supply order.",
    from_date: "2023-07-01",
    to_date: "2026-06-30",
    captured_at: "2026-07-15T00:00:00Z",
  },
  {
    id: "deb-5",
    source: "worldbank",
    entity_name: "Sahyadri Infra Projects Ltd",
    pan: "AAFCS2222Y",
    cin: null,
    din: "05566778",
    grounds: "Collusive practice in procurement.",
    from_date: "2022-11-01",
    to_date: "2025-10-31",
    captured_at: "2026-08-20T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
function provider(
  check_key: CheckKey,
  chain: string[],
  mode: ProviderMode,
  latency: number,
  health: ProviderState["providers"][number]["health"] = "ok",
): ProviderState["providers"][number] {
  return {
    check_key,
    label: CHECK_META[check_key].label,
    chain,
    mode,
    available_modes: check_key === "debarment" ? ["SNAPSHOT"] : ["LIVE", "SIMULATED"],
    health,
    last_latency_ms: latency,
  };
}

export const DEMO_PROVIDERS: ProviderState = {
  offline: false,
  providers: [
    provider("gst", ["Sandbox.co.in", "MockAdapter"], "LIVE", 412),
    provider("pan", ["Sandbox.co.in", "MockAdapter"], "LIVE", 388),
    provider("udyam", ["Sandbox.co.in", "MockAdapter"], "LIVE", 501),
    provider("mca", ["Sandbox.co.in", "MockAdapter"], "LIVE", 640),
    provider("epfo", ["MockAdapter"], "SIMULATED", 120),
    provider("esic", ["MockAdapter"], "SIMULATED", 118),
    provider("bis", ["Sandbox.co.in", "MockAdapter"], "LIVE", 720, "degraded"),
    provider("oem", ["FixtureOCR + forensics"], "SIMULATED", 210),
    provider("mii", ["Rule engine"], "SIMULATED", 40),
    provider("startup", ["MockAdapter"], "SIMULATED", 130),
    provider("nsic", ["MockAdapter"], "SIMULATED", 140),
    provider("digilocker", ["DigiLocker", "Upload + forensics"], "SIMULATED", 260),
    provider("debarment", ["World Bank + CPPP snapshot"], "SNAPSHOT", 22),
    provider("cartel", ["Entity graph"], "SIMULATED", 95),
  ],
};

// ---------------------------------------------------------------------------
// Audit log (hash-chained)
// ---------------------------------------------------------------------------
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

interface RawEvent {
  actor: string;
  action: string;
  target: string;
  payload: Record<string, unknown>;
  at: string;
}

const RAW_EVENTS: RawEvent[] = [
  { actor: "system", action: "seed.loaded", target: "dataset", payload: { bidders: 9, tenders: 3 }, at: T(7, 0) },
  { actor: "R. Meenakshi", action: "tender.opened", target: "t1", payload: { ref: "GEM/2026/B/4412201" }, at: T(8, 15) },
  { actor: "system", action: "run.started", target: "bid-b3", payload: { mode: "mixed" }, at: T(9, 55) },
  { actor: "system", action: "check.completed", target: "bid-b3:oem", payload: { verdict: "FAIL", veto: true }, at: T(9, 56) },
  { actor: "system", action: "check.completed", target: "bid-b3:bis", payload: { verdict: "FAIL" }, at: T(9, 56) },
  { actor: "system", action: "run.completed", target: "bid-b3", payload: { score: 24, band: "HIGH" }, at: T(9, 57) },
  { actor: "system", action: "run.started", target: "bid-b4", payload: { mode: "mixed" }, at: T(10, 2) },
  { actor: "system", action: "check.completed", target: "bid-b4:pan", payload: { verdict: "FAIL", veto: true }, at: T(10, 3) },
  { actor: "system", action: "run.completed", target: "bid-b4", payload: { score: 21, band: "HIGH" }, at: T(10, 4) },
  { actor: "system", action: "cartel.detected", target: "t2", payload: { cluster: ["b6", "b7"], severity: "high" }, at: T(10, 12) },
  { actor: "system", action: "debarment.match", target: "bid-b9", payload: { din: "01928374", source: "CPPP" }, at: T(10, 20) },
  { actor: "R. Meenakshi", action: "decision.recorded", target: "bid-b1", payload: { outcome: "QUALIFIED" }, at: T(11, 5) },
  { actor: "A. Verma", action: "provider.mode_changed", target: "gst", payload: { from: "SIMULATED", to: "LIVE" }, at: T(11, 20) },
  { actor: "S. Nair", action: "report.exported", target: "bid-b3", payload: { format: "pdf" }, at: T(11, 40) },
];

export const DEMO_AUDIT: AuditEvent[] = (() => {
  const out: AuditEvent[] = [];
  let prev = "0".repeat(8);
  RAW_EVENTS.forEach((e, i) => {
    const canonical = JSON.stringify({ action: e.action, target: e.target, payload: e.payload });
    const hash = djb2(prev + canonical);
    out.push({
      id: `au-${i + 1}`,
      seq: i + 1,
      actor: e.actor,
      action: e.action,
      target: e.target,
      payload: e.payload,
      prev_hash: prev,
      hash,
      created_at: e.at,
    });
    prev = hash;
  });
  return out;
})();

// ---------------------------------------------------------------------------
// Analytics + dashboard
// ---------------------------------------------------------------------------
export const DEMO_TIME_SAVINGS: TimeSavings = {
  manual_minutes_per_bidder: 210,
  pramaan_seconds_per_bidder: 88,
  bidders_processed: 9,
  hours_saved: Math.round(((210 * 60 - 88) * 9) / 3600),
  reduction_pct: 0.99,
};

export function dashboardSummary(): DashboardSummary {
  const allVerdicts = Object.values(DEMO_VERDICTS);
  const red = allVerdicts.filter((v) => v.score.band === "HIGH").length;
  const avg = Math.round(
    allVerdicts.reduce((s, v) => s + v.score.score, 0) / allVerdicts.length,
  );
  const recent_runs = allVerdicts
    .slice()
    .sort((a, b) => (b.run.finished_at ?? "").localeCompare(a.run.finished_at ?? ""))
    .slice(0, 6)
    .map((v) => ({
      run_id: v.run.run_id,
      bid_id: v.bid.id,
      bidder_name: v.bidder.legal_name,
      tender_ref: DEMO_TENDERS.find((t) => t.id === v.tender.id)?.ref_no ?? "",
      status: v.run.status,
      band: v.score.band,
      score: v.score.score,
      finished_at: v.run.finished_at,
    }));
  const alerts: AlertItem[] = [
    {
      id: "al-1",
      kind: "debarment",
      severity: "high",
      title: "Debarment match · Indus Corp",
      detail: "Director DIN 01928374 matches CPPP debarred list (0.96).",
      bidder_id: "b9",
      tender_id: "t3",
      created_at: T(10, 20),
    },
    {
      id: "al-2",
      kind: "cartel",
      severity: "high",
      title: "Cartel ring in T2",
      detail: "Falcon Services & Garuda Facilities share director, bank and submission IP.",
      tender_id: "t2",
      created_at: T(10, 12),
    },
    {
      id: "al-3",
      kind: "forgery",
      severity: "high",
      title: "Forged OEM MAF · Chola Infra LLP",
      detail: "PDF edited after signing; ELA anomaly; validity expired.",
      bidder_id: "b3",
      tender_id: "t1",
      created_at: T(9, 56),
    },
    {
      id: "al-4",
      kind: "mismatch",
      severity: "medium",
      title: "Cross-portal PAN mismatch · Deccan Supplies",
      detail: "PAN in GSTIN differs from declared PAN; GST cancelled.",
      bidder_id: "b4",
      tender_id: "t1",
      created_at: T(10, 3),
    },
    {
      id: "al-5",
      kind: "mismatch",
      severity: "low",
      title: "Udyam name mismatch · Bharat Micro Traders",
      detail: "Udyam name differs from PAN name (fuzzy 0.78).",
      bidder_id: "b2",
      tender_id: "t1",
      created_at: T(9, 41),
    },
  ];
  return {
    tenders_in_evaluation: DEMO_TENDERS.filter((t) => t.status === "evaluating").length,
    bidders_pending: allVerdicts.filter((v) => !v.decision).length,
    avg_score: avg,
    red_flags: red,
    time_savings: DEMO_TIME_SAVINGS,
    recent_runs,
    alerts,
  };
}
