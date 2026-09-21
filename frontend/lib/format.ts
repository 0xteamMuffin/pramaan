/** Display formatters. All PII shown in the demo is synthetic; masking still
 *  applies per DPDP-aligned conventions (AGENTS.md / security-and-audit). */

/** Indian currency with lakh/crore grouping. */
export function formatINR(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** Mask PAN keeping first 3 and last 1: ABCDE1234F -> ABC*****4F style. */
export function maskPan(pan: string): string {
  if (!pan || pan.length < 6) return pan;
  return `${pan.slice(0, 3)}${"•".repeat(pan.length - 5)}${pan.slice(-2)}`;
}

/** Mask GSTIN keeping state code + last 3. */
export function maskGstin(gstin: string): string {
  if (!gstin || gstin.length < 8) return gstin;
  return `${gstin.slice(0, 2)}${"•".repeat(gstin.length - 5)}${gstin.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 2)}${"•".repeat(digits.length - 4)}${digits.slice(-2)}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(iso)}, ${hh}:${mm}`;
}

/** "As on 19 Sep 2026, 10:30" · provenance language from the design system. */
export function asOn(iso: string | undefined | null): string {
  if (!iso) return "as on -";
  return `as on ${formatDateTime(iso)}`;
}

export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds && seconds !== 0) return "-";
  if (seconds < 60) return `${seconds.toFixed(0)} sec`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/**
 * Normalise em/en dashes coming from backend-generated strings into the app's
 * neutral separators, so no long dashes ever render in the UI.
 */
export function cleanText(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/\s[\u2014\u2013]\s/g, " \u00B7 ")
    .replace(/[\u2014\u2013]/g, "-");
}

export function truncateHash(hash: string, len = 10): string {
  if (!hash) return "-";
  if (hash.length <= len * 2) return hash;
  return `${hash.slice(0, len)}…${hash.slice(-6)}`;
}
