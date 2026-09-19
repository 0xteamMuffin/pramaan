# Vision & Goals

## Vision

> Give every GeM procurement officer an **AI co-pilot** that does in minutes what today takes days: verify every bidder's eligibility and statutory compliance against government sources, flag forgery and fraud, and deliver one **explainable, auditable** compliance verdict — while the **officer keeps the final decision.**

## Mission (this project)

Build a working, demonstrable platform for SIH 2025 (PS 26100) that provably covers all 14 required capabilities, adds genuinely intelligent fraud/cartel/forgery detection no competitor offers, runs on ₹0 free-tier infrastructure, and is presented with an authentically Government-of-India yet modern interface.

---

## Product name

- **Working codename:** **PRAMAAN** (प्रमाण — "proof / evidence / authority").
- Optional backronym for the deck: **P**rocurement **R**isk **A**ssessment & **M**ulti-source **A**utomated **A**uthentication **N**etwork.
- **Status:** placeholder — the team can finalize. Alternatives considered: *SATYAPAN, VeriBid, ComplyGeM, Nirikshak (निरीक्षक = inspector), Saakshya (साक्ष्य = evidence)*.

---

## Target users (personas)

| Persona | Role | Needs |
|---|---|---|
| **Priya — Procurement Officer (primary)** | Evaluates bids at a CPSE (e.g., CPCL) | Fast, trustworthy per-bidder verdict with evidence; comparison across bidders; a defensible audit trail |
| **Rajesh — Verification Analyst** | Prepares compliance for the officer | Bulk upload, re-run checks, resolve "unverifiable" items, annotate |
| **Anita — Audit / Vigilance Officer** | Post-facto scrutiny (CVC/CAG) | Immutable audit log, provenance, exportable reports |
| **Admin / IT** | Runs the platform | Configure providers, tender templates, roles, live↔mock toggles |
| **(Read-only) Bidder view** *(future)* | Vendor | See own compliance status / remediate gaps |

---

## Success metrics

**For the problem (impact targets):**
- ≥ **60–80% reduction** in per-bidder verification time (demonstrated as "manual vs PRAMAAN" stopwatch).
- 100% of the 14 required checks represented, with clear PASS/FAIL/WARN/UNVERIFIABLE.
- Every score point traceable to evidence (0 "black-box" numbers).

**For the demo/judging:**
- All 14 requirements visibly ticked in the requirements-traceability walkthrough.
- At least **3 planted frauds** caught live (forged cert, cross-portal mismatch, cartel ring).
- Works **offline** (fallback) if venue Wi-Fi fails.
- Audit report exported as PDF in one click.

---

## Guiding principles

1. **Officer-in-control, always.** AI recommends; humans decide. Reinforce in UI copy and workflow (no auto-disqualify).
2. **Explainability over cleverness.** If we can't show *why*, we don't show the number.
3. **Provenance on everything.** Source + timestamp + method on every data point.
4. **Honesty about data.** Clearly badge `LIVE` vs `SIMULATED` vs `SNAPSHOT` sources. Never fake a live integration.
5. **Fail safe on stage.** Every AI capability has an offline fallback.
6. **Auditable by design.** Immutable, hash-chained log from day one.
7. **Accessible & institutional.** GIGW 3.0 / WCAG 2.1 AA; GeM-inspired look.
8. **Configurable, not hard-coded.** Tender rules and providers are data/config, not code — because government thresholds change.

---

## Scope

**In scope (SIH build):** all 14 checks (live where possible, mock otherwise), AI extraction + forgery + cross-check, compliance scoring + recommendation, entity-graph fraud/cartel detection, officer dashboard, audit trail + PDF report, provider config layer, synthetic dataset.

**Out of scope (noted as roadmap):** production government MoUs/GSP licensing, real DigiLocker org onboarding, live cross-CPSE deployment, mobile app, bidder self-service portal (stretch).

## Non-goals

- We are **not** building a general KYB API product.
- We are **not** automating the final decision.
- We are **not** claiming to hold official government API access we don't have.
