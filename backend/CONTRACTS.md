# Backend Interface Contracts (locked)

All parallel agents MUST code against these exact signatures so slices integrate cleanly.
Do NOT change these symbols; add new ones freely.

## Already implemented (stable — import & use)
```python
# Config / DB
from app.core.config import settings, REPO_ROOT, BACKEND_DIR
from app.core.database import Base, engine, SessionLocal, get_db, init_db
from app.core.security import (create_access_token, decode_token, hash_password,
                               verify_password, get_current_user, require_role)

# Models (all ORM) + enums
from app.models import (User, Tender, TenderRequirement, Bidder, Identifier, Document,
    Bid, VerificationRun, CheckResult, Evidence, ComplianceScore, Recommendation,
    Decision, EntityNode, EntityEdge, AuditEvent, ProviderCall, DebarmentRecord,
    Verdict, RiskBand, ProviderMode, RunStatus, RecommendationStance, DecisionOutcome,
    UserRole, TenderStatus, IdentifierKind, EvidenceKind, Dimension, CHECK_KEYS)

# Providers (stable facade — DO NOT bypass)
from app.providers.registry import (get_llm, get_ocr, get_gov_provider,
                                     analyze_forensics, fixture_gov_dir)
from app.providers.base import (VerifyRequest, VerifyResult, LLMResult, OCRResult,
                                GovProvider, LLMProvider, OCRProvider)

# Compliance contracts
from app.compliance.base import (Check, CheckContext, CheckOutput, EvidenceItem,
    register, CHECK_REGISTRY, DIMENSION_WEIGHTS, VERDICT_CREDIT,
    BAND_LOW_MIN, BAND_MEDIUM_MIN, VETO_SCORE_CAP)

# Services (stable)
from app.services import audit          # audit.record(db, *, action, actor_id=None, target=None, payload=None, commit=True) -> AuditEvent
                                        # audit.verify_chain(db) -> {"intact": bool, "broken_at_seq": int|None, "count": int}
from app.services import debarment      # debarment.search(db, *, q=None, pan=None, cin=None, din=None, dins=None, limit=25) -> list[dict]
                                        # debarment.screen_bidder(db, *, name, pan, cin, dins) -> list[dict]
```

## To be implemented — ENGINE agent (owns app/compliance/checks/*, rules.py, scoring.py, engine.py, app/ai/*)
```python
# app/compliance/engine.py  (THE public engine entrypoint the API calls)
def run_verification(db: Session, bid_id: str, *, mode: str = "SIMULATED") -> VerificationRun:
    """Full pipeline for one bid. Persists CheckResult(+Evidence), ComplianceScore,
    Recommendation, ProviderCall rows, EntityNode/Edge, and audit events. Sets run
    status/timestamps. Returns the completed VerificationRun (with relations loaded)."""

def build_tender_graph(db: Session, tender_id: str) -> dict:
    """Return {"nodes":[{id,type,value,label}], "edges":[{source,target,relation,weight}],
    "clusters":[{"bidder_ids":[...],"reason":"shared director+bank+ip","severity":"high"}]}"""

# app/ai/extraction.py   -> extract_document(db, document) -> dict (writes Document.extracted, uses get_ocr())
# app/ai/crosscheck.py   -> crosscheck(ctx) -> list[CheckOutput] (PAN join key, name/date reconciliation)
# app/ai/forgery.py      -> analyze_document(document) -> dict (uses registry.analyze_forensics)
# app/ai/graph.py        -> graph builders + shell/related-party/cartel detectors
# app/ai/recommend.py    -> recommend(ctx, checks, score) -> {stance, rationale, evidence_refs, model_meta} (uses get_llm())
```
Each `Check` in `app/compliance/checks/` implements the `Check` ABC and is `register()`-ed.
Provide `app/compliance/checks/__init__.py` that imports all checks so the registry fills.
Checks to implement (dimension in parens): pan(IDENTITY), mca(IDENTITY), name_reconcile(IDENTITY),
gst(TAX_FINANCIAL), turnover(TAX_FINANCIAL), udyam(ELIGIBILITY), mii(ELIGIBILITY),
oem(ELIGIBILITY), bis(ELIGIBILITY), startup(ELIGIBILITY), nsic(ELIGIBILITY),
debarment(INTEGRITY, veto-capable), cartel(INTEGRITY), epfo(STATUTORY), esic(STATUTORY),
digilocker(DOCUMENT). Forgery findings feed DOCUMENT dimension via a doc-integrity check.

`scoring.py`: `score_run(check_outputs, requirements) -> {score, band, dimension_scores, vetoes}`
using DIMENSION_WEIGHTS/VERDICT_CREDIT/VETO_SCORE_CAP. UNVERIFIABLE/NA excluded from denominator.

## To be implemented — API agent (owns app/schemas/*, app/services/report.py, app/services/orchestrator.py, app/api/routes/*)
- Pydantic v2 schemas in `app/schemas/` for all responses in docs/03-architecture/api-design.md.
- `app/api/routes/__init__.py` MUST expose `def register_routes(api_router): ...` (router.py already calls it).
- Routes per docs/03-architecture/api-design.md, all under the aggregate router (prefixed /api/v1 by main).
- `POST /bids/{id}/verify` calls `engine.run_verification` (background task ok) and returns run id.
- `app/services/report.py`: `build_pdf(db, bid_id) -> bytes` (reportlab).
- Auth routes seed-compatible with app/seed.py demo users.

## To be implemented — DATA agent (owns data/generators/*, data/fixtures/*, data/blacklists/*, backend/app/seed.py)
- `backend/app/seed.py` runnable as `python -m app.seed` (and `python -m app.seed --reset`).
- Seeds demo users (officer@pramaan.gov.in etc.), 3 tenders + rules, 9-bidder cast with planted
  frauds (docs/05-data/dummy-dataset-spec.md), documents (Document.extracted populated so FixtureOCR
  works; set extracted["_tamper"]=true + _tamper_reason for B3/B4 forged docs), identifiers,
  bids (with submission_meta ip/bank for cartel), and DebarmentRecord rows (World Bank + CPPP
  snapshot incl. entries matching B9 + a director of B3).
- Government mock fixtures: `data/fixtures/gov/<check_key>/<identifier_value>.json` containing the
  VerifyResult.data payload (planted frauds encoded here, e.g. gst cancelled, pan mismatch).
- Deterministic (fixed seed). Golden outcomes must match dummy-dataset-spec §8.

## Cross-cutting rules
- Every mutation -> `audit.record(...)`. Every provider call -> persist a `ProviderCall` (engine does this).
- 5-state verdicts. UNVERIFIABLE != FAIL. Officer-in-control (no auto-disqualify).
- Type hints, snake_case, Pydantic v2. Keep imports lazy for optional deps.
