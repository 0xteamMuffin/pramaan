# Roadmap

Phased plan from "research done" to "winning demo." Phases are outcome-based; compress/parallelize by team size. A suggested SIH-timeline mapping is at the end.

---

## Phase 0 — Research, Planning & Scaffold ✅ (current)
**Outcome:** shared understanding + repo skeleton.
- [x] Deep research (procurement/compliance, portal APIs, AI providers, design/competitors)
- [x] Documentation set (this `docs/` tree)
- [x] Folder hierarchy + git init + commits
- [ ] Team roles assigned; provider accounts created (Gemini, Groq, Sandbox.co.in, Cashfree)

## Phase 1 — Foundation & Provider Layer
**Outcome:** backend runs; every check callable in mock; a few live.
- FastAPI skeleton, Postgres + `pgvector`, config system, Docker compose
- Data model & migrations (tenders, bidders, documents, checks, evidence, scores, audit)
- `VerificationProvider` interface + `MockAdapter` for all 13 checks (realistic fixtures)
- `LiveAdapter` for GST + PAN + MCA + Udyam via Sandbox.co.in sandbox
- Debarment snapshot loader (World Bank + CPPP archive) + fuzzy search
- Seed loader for synthetic dataset
- OpenAPI docs

## Phase 2 — AI Verification & Compliance Engine
**Outcome:** documents in → explainable verdict out.
- OCR/extraction provider chain (Gemini vision → PaddleOCR local)
- Per-doc-type field extractors + normalization (PAN/GSTIN/Udyam/CIN regex validators)
- Cross-verification (PAN join key; name/address/date matching; fuzzy)
- Compliance rule engine (tender rules + statutory checks) → PASS/FAIL/WARN/UNVERIFIABLE
- Scoring: weighted dimensions + hard vetoes + RAG band + reason breakdown
- AI recommendation generator (rationale + evidence links)
- Hash-chained audit trail writer

## Phase 3 — Dashboard & Reports
**Outcome:** officer can actually use it.
- Next.js app + GeM design system (tokens, components)
- Screens: tender list, tender detail, bidder detail (verdict-first), evidence drill-down, provider config, audit log
- Status chips, score gauge, sub-score meters, provenance stamps
- Printable/exportable audit report (PDF)
- Accessibility pass (WCAG 2.1 AA), Hindi toggle (stretch)

## Phase 4 — Wow Features & Fraud Intelligence
**Outcome:** the "did you see that?" moments.
- Entity-resolution graph (interactive) → shell/related-party detection
- Cartel/bid-rigging detection across a tender's bidders
- Document forgery detection pipeline + evidence panel (metadata/ELA/copy-move)
- Side-by-side bidder comparison + bulk ranking
- "Manual vs PRAMAAN" time meter; NL query over evidence (stretch)
- Offline-mode demonstration (Ollama/PaddleOCR)

## Phase 5 — Demo Hardening & Pitch
**Outcome:** flawless stage run.
- Deterministic demo script + seeded planted frauds
- Fallback rehearsal (kill Wi-Fi → offline still works)
- Pitch deck aligned to requirements-traceability + impact metrics
- Q&A prep (data-access honesty, scalability, security)
- Load a "wow" reset button to re-run demo cleanly

---

## Suggested SIH timeline mapping

| When | Focus |
|---|---|
| Pre-event prep | Phase 0 done; accounts + local Ollama/PaddleOCR cached; dataset seeded |
| Hack Day 1 (early) | Phase 1 (foundation + mocks + 2 live checks) |
| Hack Day 1 (late) | Phase 2 (extraction + scoring + recommendation) |
| Hack Day 2 (early) | Phase 3 (dashboard + audit PDF) |
| Hack Day 2 (mid) | Phase 4 (pick 2–3 wow features: forgery + entity graph + comparison) |
| Hack Day 2 (late) | Phase 5 (harden + rehearse) |

**De-risking rule:** keep a **working demo at the end of every phase**. Wow features are additive, never blocking. If time is short, MVP (Phase 1–3) alone already covers all 14 requirements.
