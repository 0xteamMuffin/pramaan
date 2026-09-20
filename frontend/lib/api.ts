/**
 * Typed API client for the PRAMAAN FastAPI backend (docs/03-architecture/api-design.md).
 *
 * Resilience contract: the whole UI must render even when the backend is down.
 * Every function attempts a live call and, on any network/parse/HTTP error,
 * transparently falls back to lib/demoData.ts. The returned `mode` field lets
 * the UI badge "Live data" vs "Demo data (backend unreachable)".
 */
import type {
  AuditEvent,
  AuditIntegrity,
  BidVerdict,
  Bidder,
  ComparisonMatrix,
  DashboardSummary,
  DebarmentRecord,
  Decision,
  DecisionOutcome,
  EntityGraph,
  LoginResponse,
  ProviderMode,
  ProviderState,
  Tender,
  TimeSavings,
  User,
} from "./types";
import {
  BIDDER_TO_BID,
  DEMO_AUDIT,
  DEMO_BIDDERS,
  DEMO_CREDENTIALS,
  DEMO_DEBARMENT,
  DEMO_PROVIDERS,
  DEMO_TENDERS,
  DEMO_TIME_SAVINGS,
  DEMO_USERS,
  DEMO_VERDICTS,
  comparisonFor,
  dashboardSummary,
  graphFor,
} from "./demoData";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8000/api/v1";

const TOKEN_KEY = "pramaan.token";
const USER_KEY = "pramaan.user";
const REQUEST_TIMEOUT_MS = 3500;

// ---- auth token storage (SSR-safe) --------------------------------------------
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ---- result envelope ----------------------------------------------------------
export type DataMode = "live" | "demo";

export interface ApiResult<T> {
  data: T;
  mode: DataMode;
  error?: string;
}

async function rawFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** Try live; fall back to a demo value. Never throws for read paths. */
async function withFallback<T>(path: string, demo: T, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const data = await rawFetch<T>(path, init);
    return { data, mode: "live" };
  } catch (err) {
    return {
      data: demo,
      mode: "demo",
      error: err instanceof Error ? err.message : "network error",
    };
  }
}

// ---- Auth ---------------------------------------------------------------------
export async function login(email: string, password: string): Promise<ApiResult<LoginResponse>> {
  try {
    const data = await rawFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    return { data, mode: "live" };
  } catch {
    // Demo fallback: validate against seeded demo credentials
    const expected = DEMO_CREDENTIALS[email.toLowerCase()];
    const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!expected || expected !== password || !user) {
      return {
        data: { access_token: "", refresh_token: "", user: DEMO_USERS[0] },
        mode: "demo",
        error: "invalid_credentials",
      };
    }
    const token = `demo.${btoa(email)}.token`;
    setToken(token);
    setStoredUser(user);
    return {
      data: { access_token: token, refresh_token: token, user },
      mode: "demo",
    };
  }
}

export async function getMe(): Promise<ApiResult<User>> {
  const stored = getStoredUser() ?? DEMO_USERS[0];
  return withFallback<User>("/auth/me", stored);
}

// ---- Tenders ------------------------------------------------------------------
export async function listTenders(): Promise<ApiResult<Tender[]>> {
  return withFallback<Tender[]>("/tenders", DEMO_TENDERS);
}

export async function getTender(id: string): Promise<ApiResult<Tender>> {
  const demo = DEMO_TENDERS.find((t) => t.id === id) ?? DEMO_TENDERS[0];
  return withFallback<Tender>(`/tenders/${id}`, demo);
}

export async function getComparison(tenderId: string): Promise<ApiResult<ComparisonMatrix>> {
  return withFallback<ComparisonMatrix>(`/tenders/${tenderId}/comparison`, comparisonFor(tenderId));
}

export async function getTenderGraph(tenderId: string): Promise<ApiResult<EntityGraph>> {
  return withFallback<EntityGraph>(`/tenders/${tenderId}/graph`, graphFor(tenderId));
}

export async function evaluateAll(tenderId: string): Promise<ApiResult<{ queued: number }>> {
  const demo = { queued: DEMO_TENDERS.find((t) => t.id === tenderId)?.bidder_count ?? 0 };
  return withFallback<{ queued: number }>(`/tenders/${tenderId}/evaluate`, demo, { method: "POST" });
}

// ---- Bidders ------------------------------------------------------------------
export async function getBidder(id: string): Promise<ApiResult<Bidder>> {
  const demo = DEMO_BIDDERS[id] ?? DEMO_BIDDERS.b1;
  return withFallback<Bidder>(`/bidders/${id}`, demo);
}

export function listBidders(): Bidder[] {
  return Object.values(DEMO_BIDDERS);
}

// ---- Verification / verdict ---------------------------------------------------
/** Aggregate everything the hero verdict screen needs for a bid. */
export async function getBidVerdict(bidId: string): Promise<ApiResult<BidVerdict>> {
  const demo = DEMO_VERDICTS[bidId] ?? Object.values(DEMO_VERDICTS)[0];
  // In live mode this would be composed from /runs/{id}, /score, /recommendation.
  return withFallback<BidVerdict>(`/bids/${bidId}/verdict`, demo);
}

export function bidIdForBidder(bidderId: string): string | undefined {
  return BIDDER_TO_BID[bidderId];
}

export async function verifyBid(bidId: string): Promise<ApiResult<{ run_id: string; status: string }>> {
  const demo = { run_id: `run-${bidId}`, status: "queued" };
  return withFallback(`/bids/${bidId}/verify`, demo, { method: "POST" });
}

// ---- Decision -----------------------------------------------------------------
export async function recordDecision(
  bidId: string,
  outcome: DecisionOutcome,
  note: string,
  officerName: string,
): Promise<ApiResult<Decision>> {
  const demo: Decision = {
    id: `dec-${bidId}-${Date.now()}`,
    outcome,
    note,
    officer_name: officerName,
    decided_at: new Date().toISOString(),
  };
  return withFallback<Decision>(`/bids/${bidId}/decision`, demo, {
    method: "POST",
    body: JSON.stringify({ outcome, note }),
  });
}

// ---- Debarment ----------------------------------------------------------------
export async function searchDebarment(query: {
  q?: string;
  pan?: string;
  cin?: string;
  din?: string;
}): Promise<ApiResult<DebarmentRecord[]>> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.pan) params.set("pan", query.pan);
  if (query.cin) params.set("cin", query.cin);
  if (query.din) params.set("din", query.din);
  const demo = filterDebarment(query);
  return withFallback<DebarmentRecord[]>(`/debarment/search?${params.toString()}`, demo);
}

function filterDebarment(query: { q?: string; pan?: string; cin?: string; din?: string }): DebarmentRecord[] {
  const q = (query.q ?? "").trim().toLowerCase();
  const pan = (query.pan ?? "").trim().toUpperCase();
  const cin = (query.cin ?? "").trim().toUpperCase();
  const din = (query.din ?? "").trim();
  if (!q && !pan && !cin && !din) return [];
  return DEMO_DEBARMENT.map((r) => {
    let score = 0;
    if (q && r.entity_name.toLowerCase().includes(q)) score = Math.max(score, 0.9);
    if (q) {
      // crude fuzzy: token overlap
      const rt = new Set(r.entity_name.toLowerCase().split(/\s+/));
      const qt = q.split(/\s+/);
      const overlap = qt.filter((t) => rt.has(t)).length / Math.max(1, qt.length);
      score = Math.max(score, overlap * 0.85);
    }
    if (pan && r.pan?.toUpperCase() === pan) score = Math.max(score, 1);
    if (cin && r.cin?.toUpperCase() === cin) score = Math.max(score, 1);
    if (din && r.din === din) score = Math.max(score, 1);
    return { ...r, match_score: score };
  })
    .filter((r) => (r.match_score ?? 0) > 0.4)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
}

// ---- Providers ----------------------------------------------------------------
export async function getProviders(): Promise<ApiResult<ProviderState>> {
  return withFallback<ProviderState>("/providers", DEMO_PROVIDERS);
}

export async function setProviderMode(
  checkKey: string,
  mode: ProviderMode,
): Promise<ApiResult<{ ok: boolean }>> {
  return withFallback<{ ok: boolean }>(`/providers/${checkKey}`, { ok: true }, {
    method: "PATCH",
    body: JSON.stringify({ mode }),
  });
}

export async function setOffline(offline: boolean): Promise<ApiResult<{ offline: boolean }>> {
  return withFallback<{ offline: boolean }>(`/providers/offline`, { offline }, {
    method: "POST",
    body: JSON.stringify({ offline }),
  });
}

// ---- Audit --------------------------------------------------------------------
export async function getAudit(): Promise<ApiResult<AuditEvent[]>> {
  return withFallback<AuditEvent[]>("/audit", DEMO_AUDIT);
}

export async function verifyAudit(): Promise<ApiResult<AuditIntegrity>> {
  const demo: AuditIntegrity = { intact: true, broken_at_seq: null, count: DEMO_AUDIT.length };
  return withFallback<AuditIntegrity>("/audit/verify", demo);
}

// ---- Analytics ----------------------------------------------------------------
export async function getDashboard(): Promise<ApiResult<DashboardSummary>> {
  return withFallback<DashboardSummary>("/metrics/summary", dashboardSummary());
}

export async function getTimeSavings(): Promise<ApiResult<TimeSavings>> {
  return withFallback<TimeSavings>("/metrics/time-savings", DEMO_TIME_SAVINGS);
}

// ---- Reports ------------------------------------------------------------------
export function reportUrl(bidId: string): string {
  return `${API_BASE}/bids/${bidId}/report.pdf`;
}
