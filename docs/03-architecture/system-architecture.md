# System Architecture

## 1. Overview

PRAMAAN is a three-tier system with a pluggable integration + AI layer:

1. **Presentation** — Next.js officer dashboard (verdict-first, GeM-inspired, WCAG-AA).
2. **Application/API** — FastAPI: orchestration, compliance engine, AI engine, audit.
3. **Data** — PostgreSQL (+ pgvector), object storage for documents, blacklist snapshots.

A **Provider Abstraction Layer** isolates *government data sources* and *AI providers* behind interfaces, each with `Live`, `Mock`, and `Snapshot` implementations selected by config — enabling live↔mock toggling and offline fallback.

---

## 2. Component diagram (logical)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js / TS)                            │
│  Tender console · Bidder verdict view · Evidence drill-down · Entity graph │
│  Provider config · Audit log · Comparison · PDF report      (WCAG 2.1 AA)  │
└───────────────▲───────────────────────────────────────────────┬──────────┘
                │  REST / JSON (OpenAPI)                          │
┌───────────────┴───────────────────────────────────────────────▼──────────┐
│                          BACKEND (FastAPI / Python)                        │
│                                                                            │
│  API Layer  ──►  Orchestrator (Verification Workflow)                      │
│                     │                                                       │
│   ┌─────────────────┼───────────────────────────────────────────────┐     │
│   │                 ▼                                                 │     │
│   │  ┌───────────────────────┐   ┌──────────────────────────────┐    │     │
│   │  │  Compliance Engine     │   │      AI Verification Engine  │    │     │
│   │  │  • tender rules        │◄─►│  • OCR / field extraction    │    │     │
│   │  │  • statutory checks    │   │  • cross-verification        │    │     │
│   │  │  • scoring + vetoes    │   │  • entity-resolution graph   │    │     │
│   │  │  • RAG risk band       │   │  • forgery / tamper          │    │     │
│   │  └───────────┬───────────┘   │  • recommendation (LLM)      │    │     │
│   │              │                └──────────────┬───────────────┘    │     │
│   │              ▼                               ▼                     │     │
│   │        ┌───────────────── Provider Abstraction Layer ─────────┐   │     │
│   │        │  GovProvider[]         AIProvider[] (LLM/OCR/Embed)   │   │     │
│   │        │  Live | Mock | Snapshot   with fallback chain + 429   │   │     │
│   │        └───┬───────────────┬───────────────┬──────────────────┘   │     │
│   └────────────┼───────────────┼───────────────┼───────────────────────┘    │
│                ▼               ▼               ▼                            │
│   Audit Service (hash-chained)   Debarment Service   Report Service (PDF)   │
└───────────────┬───────────────────────┬───────────────────┬───────────────┘
                ▼                        ▼                   ▼
        PostgreSQL + pgvector     Object storage        External:
        (entities, checks,        (uploaded docs,       aggregator sandboxes,
         evidence, scores,         evidence images)     LLM/OCR APIs, blacklist
         audit chain, vectors)                          snapshots, Ollama(local)
```

---

## 3. Core verification workflow (sequence)

```
Officer uploads bidder docs / triggers verification for a tender
        │
        ▼
1. Ingest       → store docs, create Verification run, write audit event
2. Extract      → AIEngine.OCR each doc → structured fields (+confidence)
3. Normalize    → validate ID formats (PAN/GSTIN/Udyam/CIN regex), canonicalize names/addresses
4. Fetch        → for each required check, GovProvider.verify() (live/mock/snapshot)
5. Cross-check  → reconcile extracted vs portal vs tender claims (PAN join key)
6. Forensics    → forgery/tamper analysis on each uploaded document
7. Graph        → build/extend entity graph; detect shell/related-party/cartel
8. Evaluate     → ComplianceEngine applies tender rules + statutory checks → per-check verdicts
9. Score        → weighted score + hard vetoes → 0–100 + RAG band + reason breakdown
10. Recommend   → LLM composes recommendation w/ rationale + evidence links
11. Persist     → results + evidence + audit chain entry
        │
        ▼
Officer reviews dashboard → (human) decision action → logged in audit trail
```

Each step emits an **audit event** and attaches **evidence** with provenance (source, timestamp, method, confidence).

---

## 4. Key design decisions

| Decision | Rationale |
|---|---|
| **Provider abstraction w/ live‖mock‖snapshot** | Honesty + demo reliability + swap providers without code change |
| **Fallback chains + retry-on-429** | Free-tier resilience; offline safety |
| **Rules as data (tender templates + check registry)** | Government thresholds change; no redeploy to update rules |
| **Evidence-first data model** | Every verdict must be explainable & auditable |
| **Hash-chained audit** | Tamper-evident, GFR/CVC-grade traceability |
| **pgvector in the same Postgres** | One datastore for app + semantic search (RAG) — simpler ops |
| **Async workflow (FastAPI + background tasks/queue)** | Verification is I/O + AI heavy; keep UI responsive |
| **Stateless API + typed contracts (OpenAPI)** | Frontend can build against mocks immediately |

---

## 5. Deployment view

```
Dev / Demo:   docker compose up
  ├─ web        (Next.js)
  ├─ api        (FastAPI + workers)
  ├─ db         (Postgres + pgvector)
  ├─ ollama     (optional, offline LLM/OCR fallback)
  └─ (optional) chroma/qdrant if not using pgvector

Prod path (documented, not built for SIH):
  managed Postgres · object storage · secrets manager · GSP/aggregator prod keys ·
  DigiLocker org onboarding · horizontal API workers · audit WORM storage
```

## 6. Scalability & performance notes
- Verification runs are **parallelizable per check** (async gather) → a bidder's full check set completes in the time of its slowest provider.
- **Bulk tender evaluation** fans out per bidder via a task queue.
- **Caching**: portal responses cached per (check, id) with TTL; deterministic mocks are instant.
- **Cost control**: OCR/LLM calls are the expensive path → cache extraction per document hash; reuse across re-runs.

## 7. Cross-references
- Data schema → [`data-model.md`](data-model.md)
- Provider layer → [`provider-abstraction.md`](provider-abstraction.md)
- Scoring → [`compliance-engine.md`](compliance-engine.md)
- AI internals → [`ai-verification-engine.md`](ai-verification-engine.md)
- API surface → [`api-design.md`](api-design.md)
- Security/audit → [`security-and-audit.md`](security-and-audit.md)
