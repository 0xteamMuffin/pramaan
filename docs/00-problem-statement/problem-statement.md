# Problem Statement 26100 — Analysis

## Official Details

| Field | Value |
|---|---|
| **PS ID** | 26100 |
| **Title** | AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement |
| **Organization** | Ministry of Petroleum & Natural Gas |
| **Department** | Chennai Petroleum Corporation Limited (CPCL) |
| **Category** | Software |
| **Theme** | Smart Automation |
| **Dataset** | To be provided / dummy bidder & tender datasets may be used for development and testing |

---

## Original Statement (verbatim, condensed)

**Background.** Government procurement through GeM involves verifying multiple statutory, regulatory and eligibility requirements of bidders. Procurement officers must examine documents for Udyam/MSME, GST + return filing, PAN/Income-Tax, Make-in-India/local content, EPFO/ESIC, Startup India, NSIC, OEM authorization, DigiLocker, blacklisting/debarment and other statutory requirements. The process is document-intensive and requires cross-checking across many government portals — causing significant manual effort, longer evaluation time, and risk of inconsistency/human error.

**Description.** Build an AI-powered integrated platform that automatically verifies eligibility and compliance of GeM bidders. It integrates with government portals/databases to retrieve/verify bidder info (Udyam, GSTN, Income Tax, PAN, MCA21, Startup India, NSIC, EPFO, ESIC, DigiLocker, Make-in-India, BIS/DPIIT, etc.). An **AI Verification Engine** analyses submitted documents + portal data, identifies missing/inconsistent info, validates compliance, and generates an overall assessment. A **Compliance Dashboard** shows the compliance score, risk level, document verification status, pending requirements, and AI recommendations. **The final qualify/disqualify decision remains with the Procurement Officer.**

---

## The 14 Required Capabilities (our checklist)

| # | Requirement | Our coverage |
|---|---|---|
| 1 | Integrate with relevant government portals/databases for automated verification | Provider layer: live aggregator APIs + faithful mocks + scraped snapshots |
| 2 | Verify Udyam/MSME status & other statutory registrations | Udyam check + classification validation |
| 3 | Verify GST registration & return filing status | GSTIN validity + GSTR-1/3B filing history |
| 4 | Verify PAN & Income-Tax compliance | PAN validity + PAN–Aadhaar link + category match |
| 5 | Check Make-in-India / local-content requirements | PPP-MII Class-I/II logic + LC threshold + CA/CS cert check |
| 6 | Verify EPFO/ESIC compliance where applicable | Establishment code checks (mocked, tender-conditional) |
| 7 | Verify Startup India, NSIC, OEM authorization | DPIIT recognition, NSIC SPRS, OEM/MAF validation |
| 8 | Perform DigiLocker / document verification | Prefer issuer-signed docs; OCR + field extraction; forgery detection |
| 9 | Identify blacklisting & debarment status | Fuzzy screening across CPPP + World Bank + ministry snapshots (name/PAN/CIN/DIN) |
| 10 | Check other statutory & tender-specific compliance | Tender rule engine (turnover, experience, EMD, ATC, specs) |
| 11 | Use AI to identify missing/inconsistent/non-compliant info | AI cross-verification + entity-resolution graph |
| 12 | Generate overall Compliance Score & Risk Level | Weighted, explainable score + Green/Amber/Red band + vetoes |
| 13 | Provide AI-generated recommendation to the officer | Recommendation engine with rationale + evidence links |
| 14 | Maintain an auditable record of verification & compliance checks | Hash-chained immutable audit trail + printable report |

> **Guardrail (non-negotiable):** the AI is **decision-support only**. The officer makes the final call. Every screen and the recommendation copy must reinforce this.

---

## Key Capabilities (as named in the PS) → our modules

1. **Multi-Portal Integration** → `providers/government/*` (live + mock adapters)
2. **AI Document Verification** → `ai/extraction`, `ai/forgery`, `ai/crosscheck`
3. **Automated Compliance Engine** → `compliance/` (tender rules + statutory checks)
4. **Risk & Compliance Scoring** → `compliance/scoring` (weights, vetoes, RAG)
5. **AI Recommendation Engine** → `ai/recommendation`
6. **Audit Trail & Dashboard** → `services/audit` + `frontend/`

## Expected Impact (targets to prove in the demo)

- **60–80% reduction** in verification effort → show a "manual vs PRAMAAN" time comparison
- Faster tender evaluation & award
- Improved compliance & transparency
- Reduced human errors & inconsistencies
- Better bidder screening & risk identification
- Standardized verification across CPSEs
- Complete auditability & traceability

---

## Our reading — what "winning" actually requires

1. **Cover all 14 — visibly.** Judges will checklist them. Our [requirements-traceability matrix](../02-planning/requirements-traceability.md) proves 1:1 coverage.
2. **Be honest about data access.** No student team gets live GSTN/DigiLocker/EPFO government access. We integrate the *same sources* via regulated aggregator sandboxes where possible and **clearly label** mocked checks. Honesty survives judge scrutiny; fake "live" demos don't.
3. **Show intelligence, not just lookups.** The winning wedge is **cross-portal inconsistency detection, forgery detection, and entity-graph fraud/cartel detection** — things a human officer physically cannot do at scale.
4. **Explainability + auditability.** A score nobody can justify is useless in government. Every number traces to evidence; every action is logged immutably.
5. **Officer-in-control.** Reinforce the decision-support framing everywhere.
6. **Reliability on stage.** Offline fallbacks (local LLM/OCR) so a dead venue Wi-Fi can't kill the demo.
7. **Look the part.** Authentically Government-of-India (GeM navy + saffron, GIGW/WCAG) yet modern.

See [`docs/06-demo/demo-script.md`](../06-demo/demo-script.md) for how we stage all of this.
