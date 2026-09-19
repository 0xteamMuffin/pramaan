# Demo Script & Pitch Plan

A tight, story-driven demo that proves all 14 requirements, lands the "wow" moments, and survives judge scrutiny. Target: **6–8 min demo + 2 min pitch**, with Q&A prep.

---

## The narrative (one tender, real drama)

> *"Meet Priya, a procurement officer at CPCL. A tender for industrial pumps just closed with several bidders. Today she'd spend days cross-checking certificates across a dozen government portals. Watch her do it in 90 seconds — and catch fraud she'd probably miss."*

We run **Tender T1** (+ a peek at T2 for the cartel) from the [dataset](../05-data/dummy-dataset-spec.md).

---

## Run of show

**0. Hook (30s)** — Open on the tender comparison matrix: 4 bidders, mixed RAG. "One click ran every statutory check across every bidder."

**1. The clean bidder (45s)** — Open **B1 (Aarav Pumps)** → 🟢 LOW. Show score gauge, sub-scores, all green chips. Click GST → **provenance stamp** ("as on … · GSTN sandbox · api-live") + 12/12 returns. *Requirements 1–4, 12 shown.*

**2. The forgery catch (75s) — WOW #1** — Open **B3 (Chola Infra)**. Score 🔴 HIGH. Top reason: `VETO Forged document`. Expand OEM/MAF → **forensic panel**: metadata diff (edited after signing), ELA heatmap, copy-move seal. Then BIS chip: number belongs to another brand. *Requirements 7, 8, 11 + forgery differentiator.*

**3. The identity fraud (45s) — WOW #2** — Open **B4 (Deccan)**. `VETO PAN mismatch`: side-by-side shows PAN-on-GST ≠ PAN-on-Udyam; GST status **Cancelled**. "A human scanning PDFs rarely catches this." *Requirements 3, 11, cross-portal detection.*

**4. The debarred bidder (30s)** — Open **B9 (Indus)**: `VETO Debarment` — director DIN matches CPPP snapshot (capture date shown). *Requirement 9.*

**5. The cartel (60s) — WOW #3** — Switch to **T2**, open **Entity Graph**: B6 & B7 (two "competitors") visibly linked by shared director + bank + submission IP; near-identical pricing. "Bid-rigging — exactly the pattern in CCI's ₹142 cr GeM case." *Requirement 11 + cartel differentiator.*

**6. Recommendation + officer-in-control (45s)** — Back to a bidder's **AI recommendation** panel: grounded rationale + evidence links, labeled *Advisory*. Priya clicks **Record Decision → ON_HOLD** with a note. *Requirement 13 + guardrail.*

**7. Audit + report (30s)** — Open **Audit log** → **Verify integrity** (green "chain intact"). Export **audit PDF**. *Requirement 14.*

**8. Reliability flex (45s) — WOW #4** — Providers screen: flip **GST live→mock**, then **Global Offline** → re-run a bidder; everything still works on local AI. "Even if the venue Wi-Fi dies, PRAMAAN doesn't." *Requirement 1 + reliability.*

**9. Impact close (20s)** — Home KPI: **"Manual ≈ 3–4 hrs/bidder → PRAMAAN ≈ 90s"** = the 60–80% reduction, quantified.

---

## Requirement coverage callouts (say these out loud)
Tie each moment to the PS number so judges tick the box: 1 (integration), 2 (Udyam), 3 (GST), 4 (PAN), 5 (MII), 6 (EPFO/ESIC in T2), 7 (Startup/NSIC/OEM), 8 (DigiLocker/doc), 9 (debarment), 10 (tender rules), 11 (AI inconsistency), 12 (score/risk), 13 (recommendation), 14 (audit).

---

## Pitch (2 min, after demo)
1. **Problem** (20s): days of manual multi-portal checking, forgery-prone uploads, human error.
2. **Solution** (20s): AI verification + compliance engine + fraud/forgery/cartel detection + explainable, auditable verdict; officer decides.
3. **Differentiation** (30s): not a KYB API — a **GeM-tender-aware** officer cockpit; forgery + cartel + entity graph nobody else does (competitor slide).
4. **Feasibility & honesty** (30s): real gov data via regulated aggregators where accessible; faithfully mocked where gated; runs on ₹0 free tiers with offline fallback.
5. **Impact** (20s): 60–80% less effort, faster award, fewer errors, standardized across CPSEs, full auditability.

---

## Judge Q&A prep
| Likely question | Crisp answer |
|---|---|
| "Is this data real?" | "Yes where we can — GST/PAN/MCA/Udyam via RBI/GSTN-regulated aggregator sandboxes (Sandbox.co.in). Gated ones (EPFO/ESIC/BIS/NSIC/GeM) are faithfully mocked with real field shapes; debarment is a public-data snapshot. Every data point is badged LIVE/SIMULATED/SNAPSHOT." |
| "Isn't this just KYB?" | "KYB tools verify a company exists. We answer 'is this bidder eligible for THIS tender?' under GFR/PPP-MII/MSME rules, and we detect forgery + cartels across bidders — which no KYB product does." |
| "Does AI disqualify bidders?" | "Never. AI is advisory; the officer records the decision — it's a separate, permissioned, audited action." |
| "How is the score trustworthy?" | "It's not a black box — every point traces to a check, every check to time-stamped evidence; weights are transparent and policy-configurable; critical frauds are hard vetoes." |
| "Scalability/cost?" | "Async per-check fan-out; caching by document hash; ₹0 steady-state on free tiers; horizontal workers in prod." |
| "Privacy/security?" | "RBAC, PII masking, DPDP-aligned retention, hash-chained tamper-evident audit; local LLM for any real PII." |
| "What if a portal is down?" | "UNVERIFIABLE ≠ FAIL — it's flagged for manual review, never penalized as fraud." |

---

## Pre-demo checklist
- [ ] `seed.py --reset` run; golden outcomes verified against the [expected table](../05-data/dummy-dataset-spec.md#8-expected-outcomes-table-golden-file-for-tests).
- [ ] Ollama + PaddleOCR + bge-m3 cached locally (offline works).
- [ ] Live sandbox key tested (and mock fallback confirmed).
- [ ] Tampered PDFs for B3/B4 loaded; forensic panel renders.
- [ ] Audit chain verifies green; PDF export works.
- [ ] "Reset demo" button returns to a clean state.
- [ ] Backup: screen-recording of the full run (in case of hardware failure).
