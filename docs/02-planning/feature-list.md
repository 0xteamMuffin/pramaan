# Feature Catalogue (MoSCoW-prioritized)

Priorities: **M** = Must (MVP / covers PS), **S** = Should (strong differentiator), **C** = Could (wow / stretch), **W** = Won't (this phase, noted for roadmap).

---

## A. Core verification & compliance (covers the 14 requirements)

| Feature | Pri | Notes |
|---|---|---|
| Tender creation from template (rules: turnover, experience, EMD, MSE/MII, OEM, BIS, ATC) | **M** | Config-driven rule set |
| Bidder profile + document upload (drag-drop PDF/image, multi-file) | **M** | With DigiLocker "pull" option |
| AI document extraction (OCR → structured fields per doc type) | **M** | Gemini vision / PaddleOCR |
| Per-check verification runner (all 13 statutory checks) | **M** | Live↔mock per provider |
| GST validity + return-filing history | **M** | 🟢 live |
| PAN validity + Aadhaar-link + category match | **M** | 🟢 live |
| Udyam/MSME status + classification sanity | **M** | 🟢/🟡 |
| MCA CIN/DIN company + director status | **M** | 🟢 |
| Make-in-India / local-content (Class-I/II) evaluation | **M** | ⚙️ |
| EPFO / ESIC (tender-conditional) | **M** | 🟡 |
| Startup India / NSIC / OEM-MAF | **M** | 🟡 |
| Blacklist / debarment fuzzy screening | **M** | 🔵 |
| Compliance score (weighted) + Risk band (RAG) + vetoes | **M** | ⚙️ explainable |
| AI recommendation with rationale + evidence links | **M** | ⚙️ |
| Officer dashboard (verdict-first, per-check chips, evidence) | **M** | |
| Immutable hash-chained audit trail | **M** | |
| Printable/exportable audit report (PDF) | **M** | |
| Provider config UI / live↔mock toggle | **M** | Judge-facing wow |

## B. Standout "wow" differentiators

| Feature | Pri | Why it wins |
|---|---|---|
| **Cross-portal inconsistency detection** (PAN as join key; name/address/date mismatches) | **S** | Strongest automatable fraud signal |
| **Entity-resolution graph** (bidder↔PAN↔GSTIN↔CIN↔DIN↔addr↔email↔phone↔bank↔IP) | **S** | Visual, memorable; foundation for fraud |
| **Shell-company / related-party detection** | **S** | Recent CIN vs claimed vintage, shared directors/address |
| **Cartel / bid-rigging detection across bidders in a tender** | **S/C** | Ties to real ₹142 cr CCI GeM case |
| **Document forgery / tamper detection** (PDF incremental-save, ELA, copy-move, LLM field cross-check) with evidence panel | **S** | Attacks #1 fraud vector; explainable heatmaps |
| **Side-by-side bidder comparison** matrix | **S** | Officer's real workflow |
| **"Manual vs PRAMAAN" time-savings meter** | **S** | Proves the 60–80% impact claim live |
| **Explain-this-score** drill-down (every point → evidence) | **S** | Trust + auditability |
| **Natural-language query** over a bidder ("Does this bidder qualify for MSE preference?") | **C** | RAG over evidence; demo dazzle |
| **Continuous monitoring / alerts** on post-award vendor status change | **C** | One-time → ongoing risk mgmt |
| **Bulk tender evaluation** (rank all bidders by compliance) | **C** | Scale story |
| **Offline mode** (local LLM/OCR) demonstrated live | **S** | Reliability flex |
| **Confidence + "unverifiable ≠ fail" handling** | **S** | Fairness/robustness maturity |
| **Bidder self-service remediation portal** | **W** | Roadmap |
| **Multilingual (Hindi + regional) UI & docs** | **C** | GIGW aligned; Indic OCR already supported |

## C. Platform / non-functional

| Feature | Pri |
|---|---|
| Role-based access (Officer / Analyst / Auditor / Admin) | **M** |
| PII minimization + masking + retention policy (DPDP-aligned) | **S** |
| Provider fallback chain + retry-on-429 | **M** |
| Deterministic mock fixtures (repeatable demo) | **M** |
| Dockerized one-command spin-up | **S** |
| Seed data loader (synthetic bidders/tenders) | **M** |
| API docs (OpenAPI/Swagger) | **S** |
| Observability (structured logs, request tracing) | **C** |

---

## MVP definition (what must work for a winning demo)

1. Create a tender → add 3–4 bidders (with documents) → run verification.
2. See per-check results (mix of live + mock + snapshot) with provenance badges.
3. Watch AI catch: (a) a forged certificate, (b) a cross-portal PAN/name mismatch, (c) a debarred bidder, (d) a cartel ring across two "competing" bidders.
4. Get an explainable compliance score + RAG + AI recommendation per bidder.
5. Compare bidders side-by-side; export an audit PDF.
6. Toggle a provider live↔mock, and show offline fallback.

Everything in **B/C** beyond this is upside that raises the ceiling.
