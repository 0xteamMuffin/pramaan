# Tech Stack & Rationale

## Summary

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js (App Router) + TypeScript + Tailwind CSS | SSR/SEO not critical, but great DX, component ecosystem, easy GeM design system; Tailwind for fast token-driven UI |
| **UI components** | Custom design-system on Tailwind (or shadcn/ui base) + Recharts/visx for data-viz + a graph lib (Cytoscape.js / react-force-graph) | Verdict-first dashboard, gauges, entity graph |
| **Backend** | FastAPI (Python 3.12) | Best fit for AI/OCR/ML; async; auto OpenAPI; Pydantic validation |
| **Task/async** | FastAPI background tasks → upgrade to Celery/RQ + Redis if needed | Verification is I/O + AI heavy |
| **DB** | PostgreSQL 16 + `pgvector` | Relational integrity for audit/evidence + vectors for RAG in one store |
| **ORM/migrations** | SQLAlchemy 2.x + Alembic | Mature, typed, migration-safe |
| **Object storage** | Local volume (dev) / S3-compatible (prod) | Uploaded docs + evidence images |
| **AI — LLM** | Gemini Flash (free) → Groq → OpenRouter → **Ollama (offline)** via `openai_compat` | Free, fast, reliable fallback |
| **AI — OCR** | Gemini vision (free) → **PaddleOCR (local, Indic+seals)** → Google Document AI (free tier) | Indian-doc fit + offline |
| **AI — embeddings/RAG** | `bge-m3` (local) / Gemini embeddings + pgvector (or Chroma) | Multilingual, free, offline |
| **Forensics** | ExifTool, PyMuPDF, pikepdf, Pillow/OpenCV (ELA, copy-move), TruFor (optional GPU) | Layered, explainable forgery detection |
| **Gov data** | Sandbox.co.in / Cashfree sandboxes (live) + Mock adapters + scraped snapshots | See portal-availability research |
| **Auth** | JWT (access/refresh) + RBAC; OAuth-ready | Officer/Analyst/Auditor/Admin roles |
| **PDF report** | WeasyPrint / ReportLab | Printable audit report |
| **Packaging** | Docker + docker-compose | One-command spin-up |
| **Testing** | pytest (backend), Vitest/Playwright (frontend) | Deterministic mocks make tests easy |
| **Lint/format** | ruff + black (Py), eslint + prettier (TS) | Consistency |
| **CI (later)** | GitHub Actions | On remote setup |

---

## Why FastAPI + Next.js (vs alternatives)

- **AI/ML gravity is in Python.** OCR (PaddleOCR), forensics (OpenCV/PyMuPDF), embeddings (sentence-transformers), and most provider SDKs are Python-first. Putting the backend in Python removes a language boundary around the hardest code.
- **Next.js** gives a polished, componentized frontend with strong TypeScript ergonomics and easy theming for the GeM design system; the officer dashboard is UI-heavy and benefits from React's ecosystem (charts, graph, tables).
- **Clean contract:** FastAPI's auto OpenAPI lets the frontend generate a typed client and build against mocks from day one.

## Why PostgreSQL + pgvector
- Audit/evidence/compliance data is **relational and integrity-critical** → Postgres.
- RAG/semantic search (NL query over evidence, fuzzy debarment) needs vectors → `pgvector` keeps it in the **same DB** (one backup, one connection, simpler ops for a hackathon). Chroma remains an easy alternative if we want a separate store.

## Configurable-by-design
- **Providers** via `providers.yaml` (see [provider-abstraction](provider-abstraction.md)) — swap Gemini↔Groq↔Ollama, live↔mock, without code changes.
- **Tender rules & check weights** via templates/registry (see [compliance-engine](compliance-engine.md)) — thresholds are data, not code.
- **Secrets** via `.env` (never committed) — see `.env.example`.

## Offline-first for demo safety
Ollama + PaddleOCR + `bge-m3` + pgvector + seeded fixtures ⇒ the whole pipeline runs with **no internet**. This is a deliberate reliability choice, not an afterthought.

## Minimum versions / key deps (indicative)
- Python 3.12, Node 20+ (works on 24), Postgres 16, Docker 24+
- Backend: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `pydantic`, `psycopg`, `pgvector`, `httpx`, `pymupdf`, `pikepdf`, `pillow`, `opencv-python`, `rapidfuzz`, `google-generativeai`/`openai`, `paddleocr` (optional), `sentence-transformers` (optional), `weasyprint`
- Frontend: `next`, `react`, `typescript`, `tailwindcss`, `recharts`, `cytoscape`/`react-force-graph`, `@tanstack/react-query`, `zod`
