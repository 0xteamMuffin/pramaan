# AGENTS.md — Persistent Project Memory & Conventions

> This file is the **single source of truth** for anyone (human or AI agent) working on PRAMAAN.
> Read this first, then `docs/README.md`. Keep it updated as decisions change.

## What this project is
**PRAMAAN** — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement.
SIH 2026, Problem Statement **26100** (MoP&NG → CPCL). Full context: `docs/00-problem-statement/problem-statement.md`.

The platform verifies bidder eligibility & statutory compliance for GeM tenders (Udyam, GST, PAN, MCA, EPFO/ESIC, MII, Startup, NSIC, OEM, DigiLocker, BIS, debarment), runs an explainable compliance engine, detects forgery/fraud/cartels, and produces an auditable verdict + AI recommendation. **The officer makes the final decision — AI is advisory only.**

---

## LOCKED DECISIONS (do not re-litigate)

| Area | Decision |
|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind CSS** in `frontend/` |
| Backend | **FastAPI (Python 3.12)** in `backend/` |
| DB (default) | **SQLite** (`sqlite:///./pramaan.db`) for zero-config run. Postgres+pgvector is the documented prod option via `DATABASE_URL`. Use SQLAlchemy 2.0. Tables via `Base.metadata.create_all` on startup (no Alembic for the hackathon). |
| **Empty-key rule** | **The whole app MUST run end-to-end with an empty `.env`.** No secret is ever required. Every provider (govt + AI) falls back to a **deterministic mock/offline** implementation when its key is missing. Keys only upgrade to "live". The user will fill keys later. |
| AI providers | Config-driven chain (see `providers.example.yaml`). Gemini/Groq/OpenRouter/Ollama via adapters; **`HeuristicProvider` fallback** produces deterministic structured output with no key. OCR falls back to **FixtureOCR** (reads known synthetic doc fields). |
| Govt providers | Live adapters (Sandbox.co.in/Cashfree) used only if keys present; otherwise **MockAdapter** (deterministic fixtures) or **SnapshotAdapter** (debarment). Every result badged `LIVE`/`SIMULATED`/`SNAPSHOT`. |
| Auth | Lightweight JWT (PyJWT) + seeded demo users + RBAC dependency. Password hash via hashlib+salt (no bcrypt dependency). |
| PDF report | **reportlab** (pure-python, no system libs). |
| Forensics | **PyMuPDF + Pillow + numpy** (metadata, incremental-update, ELA, simple copy-move). No OpenCV/heavy models required (optional/guarded). |
| Vectors/RAG | Optional; default to **rapidfuzz keyword/fuzzy** fallback so pgvector isn't required to run. |
| Naming | Product codename **PRAMAAN** (placeholder, changeable). |
| Emblem | **No Ashoka State Emblem** (2005 Act). Neutral wordmark + "not an official GoI site" disclaimer. |

### Dependency allow-list (installable via pip wheels, NO system libs)
`fastapi, uvicorn[standard], sqlalchemy, pydantic, pydantic-settings, python-multipart, httpx, pyyaml, rapidfuzz, PyJWT, pymupdf, pillow, numpy, reportlab, python-dateutil`.
Optional/guarded (import lazily, never required at startup): `google-generativeai`, `paddleocr`, `sentence-transformers`, `opencv-python-headless`, `pikepdf`.

---

## Repository layout (see also root README)
```
backend/app/{api,core,compliance,ai,providers,models,schemas,services}
frontend/{app,components,lib,styles,public}
data/{generators,fixtures,blacklists}
infra/docker ; scripts/ ; docs/
```

## Design system (frontend) — use these tokens
GeM navy `#05256E` / AA-primary `#0B3D91`, saffron `#F5821F`, teal `#0FA3A3`; success `#1A7F37`, warning `#C77700`, danger `#C0392B`, info `#0B6FB0`; slate neutrals. Fonts Inter + Mukta. RAG: <40 red, 40–69 amber, ≥70 green. Full spec: `docs/04-design/design-system.md`. Screens: `docs/04-design/dashboard-spec.md`. **Every status = color + icon + text** (WCAG AA). Provenance stamp + mode badge on data points.

## API contract
REST under `/api/v1`, documented in `docs/03-architecture/api-design.md`. FastAPI auto-docs at `/docs`. Frontend consumes via a typed client in `frontend/lib/api.ts`.

## Data model
Evidence-first, audit-first. Canonical spec: `docs/03-architecture/data-model.md`. ORM lives in `backend/app/models/`. **5-state verdicts:** `PASS/WARN/FAIL/NOT_APPLICABLE/UNVERIFIABLE`. AI recommendation and human decision are **separate records**.

## Compliance engine
Checks implement a common interface; weighted dimensions + hard vetoes + RAG band. `UNVERIFIABLE ≠ FAIL`. Spec: `docs/03-architecture/compliance-engine.md`. Weights/rules are **data** (tender templates), not hard-code.

## AI engine
Extraction → cross-check (PAN join key) → entity graph (shell/cartel) → forgery → recommendation. AI output ALWAYS becomes structured `check_result` + `evidence` before scoring (never an opaque number). Spec: `docs/03-architecture/ai-verification-engine.md`.

## Synthetic data
9-bidder cast with planted frauds + 3 tenders + debarment snapshots. Deterministic (fixed seed). Golden outcomes table in `docs/05-data/dummy-dataset-spec.md` doubles as the test oracle.

---

## Conventions
- **Python:** ruff/black style, type hints, `snake_case`. Pydantic v2 schemas. Async routers where I/O-bound.
- **TS/React:** functional components, TypeScript strict, `PascalCase` components, Tailwind utility classes + design tokens (no inline hex — use CSS vars/theme).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, scoped like `feat(backend):`). Small, logical.
- **No secrets committed.** `.env` and `providers.yaml` are gitignored; only `*.example` are tracked.
- **Every mutation → audit event.** Every external/mock call → provenance.
- **Determinism:** with empty keys, seeded data must always yield the golden outcomes.

## How to run (target)
```bash
# backend
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python -m app.seed            # seed synthetic data
uvicorn app.main:app --reload # http://localhost:8000  (docs at /docs)
# frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
# or: docker compose -f infra/docker/docker-compose.yml up
```

## Current status / progress log
- ✅ Phase 0: research + docs + repo scaffold.
- ✅ Full-stack build on autopilot (backend + frontend + data + infra). Runs with empty `.env`.
- Keep this section updated: what's done, what's next, known issues.

### Progress
- ✅ Backend foundation: config (empty-key rule), SQLAlchemy models (18 tables), enums, provider/compliance contracts, JWT+RBAC, app factory.
- ✅ Provider registry facade + fallbacks (HeuristicLLM/FixtureOCR/MockGov/inline forensics); auto-upgrades to LIVE with keys.
- ✅ Shared services: hash-chained audit ledger (+verify), debarment fuzzy search.
- ✅ Compliance + AI engine: 18 checks, weighted scoring + vetoes + policy cap, entity graph (shell/cartel), forgery, recommendation. `engine.run_verification` / `build_tender_graph`.
- ✅ Synthetic data: `gen_ids/gen_tenders/gen_bidders/gen_documents` + `app.seed` (9-bidder cast, gov fixtures, debarment snapshot). Golden outcomes verified end-to-end.
- ✅ REST API: auth, tenders (list/detail/comparison/graph/evaluate), bidders, verification (verdict/verify/decision), debarment, providers (mode/offline), audit (list/verify), metrics (summary/time-savings), reports (PDF). Serializers match `frontend/lib/types.ts` exactly.
- ✅ Frontend: Next.js 11 screens + ~35 components, GeM tokens, live API + demo fallback; `npm run build` passes.
- ✅ Infra: docker-compose (api+web), `scripts/dev.sh`, `scripts/seed.sh`.

### Phase 2 (production polish)
- ✅ Live AI adapters wired via httpx (no new deps): Gemini (`gemini-flash-latest`, thinkingBudget=0) + Groq (`openai/gpt-oss-20b`) for reasoning; Gemini Vision for upload OCR. Guarded: empty `.env` still runs; models refreshed for 2026. Government checks stay simulated by design (synthetic IDs; preserves golden demo).
- ✅ Officer authoring flows: `POST /tenders` (create), `POST /bidders` (create + attach), `POST /bidders/{id}/documents` (multipart upload -> live OCR + forensic verdict). FixtureOCR now extracts embedded PDF text + regexes IDs so uploads surface data with no key.
- ✅ Full frontend redesign (impeccable skill, product+brand registers): distinctive landing page, attention-first dashboard (no KPI-grid), reworked verdict hero + all screens, flattened cards, removed eyebrows, copy rewrite (no em/en dashes), Create Tender + Add-Bidder/Upload flows. `npm run build` passes (16 routes); audited via Playwright.
- ✅ PRODUCT.md + DESIGN.md added as design anchors.

### Known issues / next
- `high_risk_count` on the tender LIST is derived from persisted runs (seed pre-runs all bids, so it's correct after seeding).
- Provider live adapters (Sandbox.co.in) are structured but only exercised when keys are present; mocks cover 100% otherwise.
- Optional heavy AI (real Gemini/Groq/PaddleOCR) are import-guarded; not required.
- Next candidates: per-check re-run endpoint, bulk tender ranking UI polish, live adapter integration tests when keys added.
