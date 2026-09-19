# Backend — FastAPI (PRAMAAN)

Python FastAPI service: verification orchestration, compliance + AI engines, provider layer, audit. To be implemented in Phase 1+ (see [`docs/02-planning/roadmap.md`](../docs/02-planning/roadmap.md)).

## Structure
```
backend/
├── app/
│   ├── api/           # FastAPI routers (see docs/03-architecture/api-design.md)
│   ├── core/          # config, settings, security (JWT/RBAC), db session, logging
│   ├── compliance/    # rule engine + checks + scoring (docs: compliance-engine.md)
│   │   ├── checks/     # one module per check (gst, pan, udyam, mii, oem, debarment, ...)
│   │   ├── rules.py    # tender rule evaluation (rules-as-data)
│   │   └── scoring.py  # weighted score + vetoes + RAG band
│   ├── ai/            # AI verification engine (docs: ai-verification-engine.md)
│   │   ├── extraction/ # OCR -> structured fields
│   │   ├── crosscheck/ # cross-portal reconciliation (PAN join key)
│   │   ├── graph/      # entity-resolution graph + fraud/cartel detectors
│   │   ├── forgery/    # metadata/ELA/copy-move/LLM field cross-check
│   │   └── recommend/  # grounded LLM recommendation
│   ├── providers/     # provider abstraction (docs: provider-abstraction.md)
│   │   ├── government/ # live (sandbox) + mock + snapshot adapters per check
│   │   ├── llm/        # gemini + openai_compat (groq/openrouter/ollama)
│   │   └── ocr/        # gemini_vision + paddleocr + document_ai
│   ├── models/        # SQLAlchemy models (docs: data-model.md)
│   ├── schemas/       # Pydantic request/response schemas
│   └── services/      # audit (hash-chain), debarment search, report (PDF), orchestrator
└── (tests/, alembic/, pyproject.toml — added in Phase 1)
```

## Run (planned)
```bash
# from repo root, after Phase 1 scaffolding
docker compose up            # api + db (+ optional ollama)
# or local:
uvicorn app.main:app --reload
```

## Principles
- Rules & providers are **config/data**, not hard-code.
- Every AI output becomes a structured `check_result` + `evidence` before scoring.
- Every mutation writes a hash-chained audit event.
