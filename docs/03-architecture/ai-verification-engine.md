# AI Verification Engine

The AI engine turns raw documents + portal data into **structured, evidence-backed findings** that the deterministic [compliance engine](compliance-engine.md) can score. AI never emits an opaque verdict — it emits *evidence*.

Five sub-systems:
1. Document extraction (OCR → fields)
2. Cross-verification (reconciliation)
3. Entity-resolution graph (fraud/cartel)
4. Forgery / tamper detection
5. Recommendation generation (LLM)

---

## 1. Document extraction (OCR → structured fields)

**Flow:** `document → OCR provider → raw text/layout → doc-type field extractor → normalized fields (+confidence)`

- **Provider chain:** Gemini vision (free) → PaddleOCR-VL local (Indic + tables + seals) → Google Document AI (free tier). Selected via `providers.yaml` with fallback.
- **Doc-type extractors** know the shape of each certificate (Udyam, GST, PAN, MAF, BIS, ISO, etc.) and pull the fields that matter.
- **Normalization + format validation** with regex (from research):

| ID | Regex |
|---|---|
| PAN | `^[A-Z]{5}[0-9]{4}[A-Z]$` (4th char = holder type) |
| GSTIN | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` |
| Udyam | `^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$` |
| CIN | `^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$` |
| DPIIT | `^DIPP[0-9]+$` · ESIC `^[0-9]{17}$` · BIS ISI `^CM/L-?[0-9]{6,8}$` · CRS `^R-?[0-9]{10}$` |

Extraction results are cached by `file_hash` → re-runs are instant and stable for demos.

Output per document:
```jsonc
{ "doc_type": "udyam_cert",
  "fields": { "udyam_no": "UDYAM-TN-24-0001234", "pan": "AAEC…", "enterprise_type": "Micro", "nic": ["25…"] },
  "confidence": 0.93, "ocr_provider": "gemini_vision" }
```

---

## 2. Cross-verification (the inconsistency detector)

The single strongest automatable fraud signal is **cross-portal mismatch**. Using **PAN as the universal join key** (PAN is embedded in GSTIN chars 3–12 and present in Udyam/MCA/EPFO/ESIC):

Reconciliation checks:
- **PAN consistency:** declared PAN == PAN on card == PAN embedded in GSTIN == PAN on Udyam/MCA. Any mismatch → identity-fraud veto.
- **Name matching:** legal/trade name across PAN, GST, Udyam, MCA — via fuzzy match (`rapidfuzz`, token-set ratio) with a threshold; below → WARN/FAIL with the diff shown.
- **Constitution vs PAN 4th char:** e.g., claims "Private Ltd" but PAN 4th char = `P` (individual) → flag.
- **Dates:** CIN incorporation year vs claimed experience/vintage; certificate validity vs bid date (expired = FAIL).
- **Address/contact** overlaps feed the entity graph (below).
- **Classification sanity:** "Micro" claim vs turnover/GST scale → WARN for manual review.

Each reconciliation emits a structured `check_result` + `evidence` (what was compared, from where, the similarity score).

---

## 3. Entity-resolution graph (shell / related-party / cartel)

Build a graph across **all bidders in a tender**:
- **Nodes:** bidder, PAN, GSTIN, CIN, DIN(director), address, email, phone, bank account, submission IP.
- **Edges:** `has_pan`, `has_director`, `shares_address`, `shares_bank`, `same_ip`, etc.

**Detectors (deterministic graph queries, AI-assisted normalization):**
| Pattern | Signal |
|---|---|
| **Shell company** | CIN incorporation year ≫ recent vs claimed experience; no EPFO/ESIC footprint; dormant GST |
| **Related-party ring** | Two "competing" bidders share director/DIN, address, bank, phone, or email |
| **Cartel / bid-rigging** | Shared submission IP/session; near-identical pricing/decrements; bid rotation across tenders |

These map to the "Integrity & exclusion" dimension and can trigger vetoes. The graph is also the most **visually memorable** demo artifact (interactive). Grounded in real cases (CCI's ₹142 cr GeM bid-rigging).

---

## 4. Forgery / tamper detection

Layered, explainable pipeline (no single tool is definitive) — see [ai-provider-research](../01-research/ai-provider-research.md):

| Layer | Technique | Catches |
|---|---|---|
| **Provenance/metadata** | ExifTool + PyMuPDF/pikepdf; **PDF incremental-update detection** | Photoshop producer, mismatched create/modify dates, post-signing edits |
| **Pixel forensics** | Error Level Analysis (ELA), noise/quantization | Spliced/pasted regions, re-saved patches |
| **Copy-move** | OpenCV SIFT/ORB keypoint matching | Duplicated seals/signatures/text blocks |
| **Deep (optional GPU)** | TruFor / PhotoHolmes | Learned manipulation heatmaps |
| **Semantic** | LLM cross-check of extracted fields vs reference/portal data | Impossible dates, fake authority names, template mismatch |

Output: a forensic verdict (`clean`/`suspect`/`tampered`) + **human-readable evidence** (metadata diff, ELA heatmap image, matched regions) shown in an evidence panel. High-confidence `tampered` → forgery veto.

---

## 5. Recommendation generation (LLM)

The LLM composes a **grounded, advisory** recommendation — it does **not** decide.

- **Input:** all structured `check_results` + `compliance_score` + top reasons + evidence refs (RAG over the run's evidence via pgvector).
- **Prompt discipline:** the model may only cite provided evidence; it outputs a `stance` (RECOMMEND_QUALIFY / FURTHER_SCRUTINY / RECOMMEND_DISQUALIFY) + rationale + the evidence ids it used.
- **Guardrails:** temperature low; JSON-schema output; a validator ensures every claim references an existing evidence id (no hallucinated facts). Advisory framing enforced in copy ("Recommendation for the officer's consideration").
- **Provider chain:** Gemini → Groq → OpenRouter → Ollama (offline).
- **NL query (stretch):** officer asks "Does this bidder qualify for MSE preference?" → RAG answer grounded in evidence.

Example:
```jsonc
{ "stance": "FURTHER_SCRUTINY",
  "rationale": "GST and PAN are verified and active, but the Udyam 'Micro' classification is inconsistent with reported turnover, and a director DIN matches a debarment snapshot. Recommend manual verification before qualification.",
  "evidence_refs": ["ev_9f…","ev_2a…","ev_71…"],
  "model": "gemini-2.5-flash" }
```

---

## 6. Reliability & determinism
- Every AI capability has an **offline fallback** (Ollama/PaddleOCR/bge-m3) → demo survives no-internet.
- Extraction cached by `file_hash`; mock providers make full runs deterministic.
- AI outputs are **always** converted to structured `check_result` + `evidence` before touching the score → auditable, testable, non-opaque.
