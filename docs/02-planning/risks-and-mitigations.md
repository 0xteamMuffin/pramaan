# Risks & Mitigations

## Technical risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Free LLM/OCR API rate-limits (429) mid-demo | High | Medium | Provider **fallback chain** (Gemini→Groq→OpenRouter→**Ollama local**); pre-warm + cache; deterministic mock replay for the exact demo bidders |
| Venue Wi-Fi dies / gov sites geo-blocked | High | Medium | **Full offline mode**: local Ollama + PaddleOCR + Chroma + seeded fixtures; demo runs with zero internet |
| Aggregator sandbox key not issued in time | Medium | Medium | Sandbox.co.in is self-serve; **mocks cover 100%** of checks regardless — live is a bonus, not a dependency |
| OCR misreads Indic/stamped certificates | Medium | Medium | PaddleOCR-VL (Indic + seals) + Gemini vision + regex validators + confidence thresholds; "unverifiable" state, not silent fail |
| Entity-graph/cartel logic too heavy for hack time | Medium | Medium | Build on seeded relationships in the synthetic dataset; graph is additive (Phase 4), MVP unaffected |
| Postgres/pgvector setup friction | Low | Low | Docker compose one-command; SQLite fallback for local dev |
| PDF/forgery libs (TruFor GPU) unavailable | Low | Medium | Tiered pipeline: metadata + ELA + copy-move run CPU-only; deep model optional |

## Demo / judging risks

| Risk | Impact | Mitigation |
|---|---|---|
| Judges probe "is this data real?" | High | **Honesty by design**: `LIVE`/`SIMULATED`/`SNAPSHOT` badges everywhere + a prepared one-liner on GSP/authorized-entity gating; production integration path documented |
| "Isn't this just KYB?" | High | Lead with **tender-eligibility engine + cartel/forgery detection + officer dashboard** — see competitor-analysis; show a comparison slide |
| "Does AI make the final call?" | High | Emphasize **officer-in-control**: no auto-disqualify; #13 outputs a recommendation; decision is a logged human action |
| Score seen as black-box | Medium | **Explain-this-score** drill-down: every point → evidence; reason breakdown always visible |
| Too many features, unclear story | Medium | Tight **demo script** with a narrative (one tender, 4 bidders, 4 planted frauds caught) |
| Nothing "wows" | Medium | Reserve the forgery reveal + cartel-graph as the climax moments |

## Data / legal / ethical risks

| Risk | Impact | Mitigation |
|---|---|---|
| Using real bidder PII | High | **Only synthetic data**; all PANs/GSTINs are fake-but-format-valid; documented in dataset spec |
| Misusing Ashoka State Emblem (2005 Act) | Medium | **No emblem**; neutral wordmark; disclaimer "not an official GoI site" |
| Scraped debarment data staleness/accuracy | Medium | Snapshot with capture date shown; clearly labeled `SNAPSHOT`; note live-refresh as production step |
| DPDP / privacy for real deployment | Medium | Design PII minimization, masking, retention, consent (DigiLocker consent flow) — documented in security doc |
| False accusation of a bidder (fairness) | High | AI is **advisory**; distinguish FAIL vs UNVERIFIABLE; require human confirmation; log rationale |

## Team / process risks

| Risk | Mitigation |
|---|---|
| Scope creep vs limited hack time | MoSCoW discipline; MVP (Phase 1–3) covers all 14 requirements before any wow feature |
| Integration merge chaos | Clear module boundaries (providers/compliance/ai/services/frontend); OpenAPI contract first |
| One person = bottleneck | Parallelizable modules; mocks unblock frontend before backend live-checks exist |

---

## Top 3 to watch (owner-assign these)
1. **Offline fallback actually works** — rehearse with Wi-Fi off. *(Highest demo-safety leverage.)*
2. **Deterministic planted-fraud demo** — the 4 catches must fire every run.
3. **Honesty framing rehearsed** — the data-access answer must be crisp and confident.
