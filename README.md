# PRAMAAN — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

> **प्रमाण (Pramaan)** — *Sanskrit for "proof / evidence / authority".*
> An AI decision-support platform that verifies bidder eligibility & statutory compliance for Government e-Marketplace (GeM) procurement — turning days of manual, multi-portal document checking into minutes of explainable, auditable, evidence-backed assessment.

**Smart India Hackathon 2025 · Problem Statement `26100`**
**Organization:** Ministry of Petroleum & Natural Gas → Chennai Petroleum Corporation Limited (CPCL)
**Category:** Software · **Theme:** Smart Automation

> ⚠️ *"PRAMAAN" is a working codename and can be changed. See [`docs/02-planning/vision-and-goals.md`](docs/02-planning/vision-and-goals.md).*

---

## The Problem (in one line)

A GeM procurement officer must manually cross-verify **13+ statutory registrations** (Udyam/MSME, GST + returns, PAN/Income-Tax, MCA21, Startup India, NSIC, EPFO, ESIC, DigiLocker, Make-in-India local content, BIS, OEM authorization, blacklisting/debarment) for **every bidder in every tender** — across a dozen government portals, mostly from **self-declared, uploaded PDFs** that are easy to forge and slow to check. This is the single biggest bottleneck and error source in tender evaluation.

## Our Solution (in one line)

An **AI Verification Engine** ingests bidder documents + tender rules, **auto-extracts and cross-verifies** every claim against government sources (real APIs where available, faithfully simulated where gated), runs a **rules + AI compliance engine**, detects **document forgery and cross-portal inconsistencies**, and produces an **explainable Compliance Score + Risk Level** with a **provenance-stamped, printable audit report** — while the **final qualify/disqualify decision stays with the officer**.

---

## Why this can win SIH (our differentiators)

The market has generic KYB / due-diligence tools (Karza/Perfios, Signzy, Probe42, Tofler). **None is purpose-built for GeM bid eligibility.** That gap is our edge. Beyond the 14 required checks, we go further:

| # | Standout capability | Why it wins |
|---|---|---|
| 1 | **Explainable compliance scoring** with hard "knock-out" vetoes + reason breakdown | Judges & officers trust a score only if they can see *why*. Every point is traceable to evidence. |
| 2 | **Cross-Portal Entity-Resolution Graph** (bidder ↔ PAN ↔ GSTIN ↔ CIN ↔ DIN ↔ address ↔ email ↔ phone ↔ bank ↔ IP) | Detects **shell companies, related-party rings, and cartels/bid-rigging** — the frauds that cost the exchequer crores (e.g., CCI's ₹142 cr GeM bid-rigging case). |
| 3 | **Document forgery / tamper detection** (PDF metadata + incremental-save forensics, ELA, copy-move, LLM field cross-check) | Attacks the #1 fraud vector: uploaded fake certificates. |
| 4 | **Tender-aware compliance** — maps raw data to *this tender's* eligibility rules (turnover, MSE/MII class, OEM/MAF, BIS) | No competitor understands GeM/PPP-MII/MSME rules natively. |
| 5 | **PAN as universal join key** reconciliation across all portals | Catches the strongest automatable fraud signal: cross-portal name/PAN mismatch. |
| 6 | **Pluggable AI + provider layer** with live↔mock toggle and offline fallback (Ollama/PaddleOCR) | Runs on ₹0 free tiers, and **works even if the venue Wi-Fi dies** — critical demo insurance. |
| 7 | **Immutable, hash-chained audit trail** + one-click officer audit report (PDF) | GFR-grade auditability & traceability. |
| 8 | **Side-by-side bidder comparison** + **continuous monitoring** (status change alerts post-award) | Turns a one-time check into ongoing vendor risk management. |
| 9 | **Authentically Government-of-India UI** (GeM navy `#05256E` + saffron `#F5821F`, GIGW/UX4G + WCAG 2.1 AA) that is still modern | Instant institutional trust that generic SaaS lacks. |

---

## Tech Stack (decided)

| Layer | Choice |
|---|---|
| **Frontend** | Next.js (React, TypeScript, App Router) + Tailwind — GeM-inspired design system |
| **Backend** | FastAPI (Python) — ideal for AI/OCR/ML |
| **Database** | PostgreSQL (+ `pgvector` for semantic search / RAG) |
| **AI — reasoning** | Configurable chain: Gemini Flash (free) → Groq → OpenRouter → **Ollama (offline fallback)** |
| **AI — OCR/extraction** | Gemini Vision (free) → **PaddleOCR (local, Indic + tables + seals)** → Google Document AI (free tier) |
| **AI — embeddings/RAG** | `bge-m3` (local, multilingual) / Gemini embeddings + Chroma/pgvector |
| **Forgery detection** | ExifTool + pikepdf/PyMuPDF + ELA + copy-move (+ TruFor if GPU) |
| **Gov data** | **Real** via aggregator sandboxes (Sandbox.co.in / Cashfree) for GST, PAN, MCA, DigiLocker, Udyam; **Mock** for EPFO/ESIC/NSIC/BIS/Startup/GeM; **scraped snapshot** for debarment lists (World Bank + CPPP) |

> Full rationale + free-tier limits in [`docs/01-research/ai-provider-research.md`](docs/01-research/ai-provider-research.md) and [`docs/03-architecture/tech-stack.md`](docs/03-architecture/tech-stack.md).

---

## Repository Structure

```
gem-sih/
├── README.md                 ← you are here
├── docs/                     ← ALL research, planning, architecture, design (start here)
│   ├── 00-problem-statement/ ← original PS + our analysis
│   ├── 01-research/          ← 4 deep research reports (sourced)
│   ├── 02-planning/          ← vision, requirements traceability, features, roadmap, risks
│   ├── 03-architecture/      ← system design, data model, engines, providers, API, security
│   ├── 04-design/            ← design system (GeM palette), dashboard spec
│   ├── 05-data/              ← dummy bidder/tender dataset spec
│   └── 06-demo/              ← SIH demo script & pitch plan
├── frontend/                 ← Next.js app (scaffold in next phase)
├── backend/                  ← FastAPI app (scaffold in next phase)
│   └── app/{api,core,compliance,ai,providers,models,schemas,services}
├── data/                     ← fixtures, generators, blacklist snapshots
├── infra/                    ← docker / compose / deploy
└── scripts/                  ← utilities
```

## Run it (works with an EMPTY `.env` — no keys required)

> The whole platform runs end-to-end offline with deterministic mock/heuristic
> providers. Add keys later to upgrade any check to **live**.

**Option A — Docker (one command):**
```bash
docker compose -f infra/docker/docker-compose.yml up --build
# web → http://localhost:3000   ·   api → http://localhost:8000/docs
```

**Option B — Local:**
```bash
# backend
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python -m app.seed --reset        # seed synthetic bidders/tenders (deterministic)
uvicorn app.main:app --reload     # http://localhost:8000  (Swagger at /docs)
# frontend (new terminal)
cd frontend && npm install && npm run dev   # http://localhost:3000
```
Demo login: **officer@pramaan.gov.in** / **pramaan123** (also analyst@/auditor@/admin@).

To go live later, drop keys into a root `.env` (see `.env.example`): `GEMINI_API_KEY`,
`GROQ_API_KEY`, `SANDBOX_KEY`/`SANDBOX_SECRET`, etc. Missing keys → automatic mock fallback.

## Start Here

1. [`docs/README.md`](docs/README.md) — documentation index
2. [`AGENTS.md`](AGENTS.md) — locked decisions & conventions (read before contributing)
3. [`docs/00-problem-statement/problem-statement.md`](docs/00-problem-statement/problem-statement.md) — the PS + our analysis
4. [`docs/03-architecture/system-architecture.md`](docs/03-architecture/system-architecture.md) — how it all fits together

---

## Status

🟢 **Full-stack build complete (autopilot).** Runs end-to-end with an empty `.env`.

| Layer | State |
|---|---|
| Backend (FastAPI) | ✅ foundation, 18-check compliance+AI engine, provider layer (mock/live/snapshot), hash-chained audit, REST API |
| Data | ✅ deterministic 9-bidder fraud cast + 3 tenders; golden outcomes verified end-to-end |
| Frontend (Next.js) | ✅ 11 screens, ~35 components; `npm run build` passes; live API + demo fallback |
| Infra | ✅ docker-compose + dev scripts |

**Verified golden outcomes:** B1 LOW · B2/B8 MEDIUM · B3 (forgery+OEM) · B4 (PAN-mismatch+GST-cancelled) · B5 (shell) · B6/B7 (cartel) · B9 (debarment) all HIGH. Audit chain integrity ✓.

See the full plan in [`docs/02-planning/roadmap.md`](docs/02-planning/roadmap.md).

---

*Expected impact (per the problem statement): 60–80% reduction in verification effort, faster tender award, improved compliance & transparency, fewer human errors, better risk screening, standardized verification across CPSEs, and complete auditability.*
