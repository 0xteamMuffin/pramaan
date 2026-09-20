import type { CheckKey, Dimension, Verdict, RiskBand, ProviderMode } from "./types";

export interface CheckMeta {
  key: CheckKey;
  label: string;
  short: string;
  dimension: Dimension;
  vetoCapable: boolean;
  blurb: string;
}

/** Canonical metadata for the 17 check keys (mirrors backend CHECK_KEYS). */
export const CHECK_META: Record<CheckKey, CheckMeta> = {
  pan: {
    key: "pan",
    label: "PAN validity & category",
    short: "PAN",
    dimension: "identity_legal_existence",
    vetoCapable: false,
    blurb: "PAN active, Aadhaar-linked and category matches declared constitution.",
  },
  mca: {
    key: "mca",
    label: "MCA (CIN / director status)",
    short: "MCA",
    dimension: "identity_legal_existence",
    vetoCapable: false,
    blurb: "Company active on MCA; directors not disqualified; vintage sane.",
  },
  name_reconcile: {
    key: "name_reconcile",
    label: "Cross-portal name reconciliation",
    short: "Name match",
    dimension: "identity_legal_existence",
    vetoCapable: false,
    blurb: "Legal name consistent across PAN, GST, Udyam and MCA.",
  },
  gst: {
    key: "gst",
    label: "GST registration & returns",
    short: "GST",
    dimension: "tax_financial",
    vetoCapable: true,
    blurb: "GSTIN active and recent GSTR-1/3B returns filed.",
  },
  turnover: {
    key: "turnover",
    label: "Turnover threshold",
    short: "Turnover",
    dimension: "tax_financial",
    vetoCapable: false,
    blurb: "Average annual turnover meets the tender minimum.",
  },
  udyam: {
    key: "udyam",
    label: "Udyam / MSME status",
    short: "Udyam",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "Udyam registration valid; classification consistent with turnover.",
  },
  mii: {
    key: "mii",
    label: "Make-in-India / local content",
    short: "MII",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "PPP-MII Class-I/II claim supported by local-content evidence.",
  },
  oem: {
    key: "oem",
    label: "OEM authorization (MAF)",
    short: "OEM/MAF",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "Manufacturer authorization valid, unexpired and for the quoted brand.",
  },
  bis: {
    key: "bis",
    label: "BIS certification",
    short: "BIS",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "BIS licence valid and registered to the quoted product/brand.",
  },
  startup: {
    key: "startup",
    label: "Startup India (DPIIT)",
    short: "Startup",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "DPIIT recognition valid; exemption scope matches the offered item.",
  },
  nsic: {
    key: "nsic",
    label: "NSIC registration",
    short: "NSIC",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "NSIC/SPRS registration valid and within monetary limit.",
  },
  debarment: {
    key: "debarment",
    label: "Debarment / blacklist screening",
    short: "Debarment",
    dimension: "integrity_exclusion",
    vetoCapable: true,
    blurb: "Fuzzy match against World Bank / CPPP debarment snapshots.",
  },
  cartel: {
    key: "cartel",
    label: "Cartel / related-party signals",
    short: "Cartel",
    dimension: "integrity_exclusion",
    vetoCapable: true,
    blurb: "Shared director/address/bank/IP across competing bidders.",
  },
  epfo: {
    key: "epfo",
    label: "EPFO establishment",
    short: "EPFO",
    dimension: "statutory_labour",
    vetoCapable: false,
    blurb: "EPFO code active where the tender requires labour compliance.",
  },
  esic: {
    key: "esic",
    label: "ESIC establishment",
    short: "ESIC",
    dimension: "statutory_labour",
    vetoCapable: false,
    blurb: "ESIC code active where the tender requires labour compliance.",
  },
  digilocker: {
    key: "digilocker",
    label: "Document integrity & DigiLocker",
    short: "Documents",
    dimension: "document_integrity",
    vetoCapable: true,
    blurb: "Issuer-signed pulls preferred; uploaded docs scanned for tampering.",
  },
  experience: {
    key: "experience",
    label: "Past experience",
    short: "Experience",
    dimension: "eligibility_claim_authenticity",
    vetoCapable: false,
    blurb: "Claimed years of experience supported by verifiable records.",
  },
};

export const CHECK_ORDER: CheckKey[] = [
  "debarment",
  "cartel",
  "pan",
  "name_reconcile",
  "mca",
  "gst",
  "turnover",
  "udyam",
  "mii",
  "oem",
  "bis",
  "startup",
  "nsic",
  "epfo",
  "esic",
  "digilocker",
  "experience",
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  identity_legal_existence: "Identity & legal existence",
  tax_financial: "Tax & financial",
  eligibility_claim_authenticity: "Eligibility & claim authenticity",
  integrity_exclusion: "Integrity & exclusion",
  statutory_labour: "Statutory (labour)",
  document_integrity: "Document integrity",
};

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  identity_legal_existence: 0.25,
  tax_financial: 0.2,
  eligibility_claim_authenticity: 0.2,
  integrity_exclusion: 0.15,
  statutory_labour: 0.1,
  document_integrity: 0.1,
};

// ---- Verdict presentation ------------------------------------------------------
export interface VerdictStyle {
  label: string;
  icon: "check" | "alert" | "x" | "help" | "minus";
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}

export const VERDICT_STYLE: Record<Verdict, VerdictStyle> = {
  PASS: { label: "Pass", icon: "check", tone: "success" },
  WARN: { label: "Warn", icon: "alert", tone: "warning" },
  FAIL: { label: "Fail", icon: "x", tone: "danger" },
  UNVERIFIABLE: { label: "Unverifiable", icon: "help", tone: "info" },
  NOT_APPLICABLE: { label: "N/A", icon: "minus", tone: "neutral" },
};

export function bandOfScore(score: number): RiskBand {
  if (score >= 70) return "LOW";
  if (score >= 40) return "MEDIUM";
  return "HIGH";
}

export const BAND_LABEL: Record<RiskBand, string> = {
  LOW: "Low risk",
  MEDIUM: "Medium risk",
  HIGH: "High risk",
};

export const MODE_LABEL: Record<ProviderMode, string> = {
  LIVE: "Live",
  SIMULATED: "Simulated",
  SNAPSHOT: "Snapshot",
};

export function checkLabel(key: CheckKey): string {
  return CHECK_META[key]?.label ?? key;
}

export function checkShort(key: CheckKey): string {
  return CHECK_META[key]?.short ?? key;
}
