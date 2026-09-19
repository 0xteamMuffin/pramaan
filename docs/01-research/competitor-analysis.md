# Research — Competitor / Landscape Analysis

> **Headline finding:** There is **no dominant player positioned specifically as "GeM bid-compliance / tender-eligibility verification."** The market is general-purpose **KYB (Know Your Business) / due-diligence**. That is precisely our differentiation gap.

---

## The landscape (India KYB & due diligence)

| Provider | Category | Core features | Data depth | Gap vs a GeM-compliance product |
|---|---|---|---|---|
| **Karza → Perfios** (acq. 2022) | KYB / onboarding APIs | MCA/GST/PAN/Udyam verification, bank-statement analysis, UBO, AML/PEP & watchlists, litigation | Very broad API suite | Not GeM/tender-eligibility aware; API-first, not a buyer dashboard |
| **Signzy** | No-code KYC/KYB | One-Touch KYB, registration & ownership, UBO, sanctions/AML, video KYC | Broad, global | Generic onboarding; no procurement/bid context |
| **Probe42** | Company intelligence | MCA-native, 500+ data points on ~2M active companies, financials, charges, litigation | Deep MCA + financials | Credit/banking focus; no bid-compliance scoring |
| **Tofler** | Business research | Company360 profiles, financials, MCA docs, directors, credit reports | Deep MCA/financials | Research tool, not a verification/eligibility engine |
| **Perfios** | Financial data aggregation | Statement analysis, income/GST analytics, KYB (via Karza) | Financial heavyweight | Lending-centric |
| **AuthBridge** | Background verification | Vendor/employee onboarding, KYB, doc checks, risk | Broad BGV | BGV-centric; no GeM logic |
| **IDfy** | Identity/verification | KYC/KYB, fraud, video ID | Broad | Identity-first |
| **SurePass / Zauba Corp / InstaFinancials** | Verification APIs / company data | PAN/GST/Udyam APIs; MCA records | Registry data | Raw data, minimal UX/scoring |

*Sources: qorpiq.com/alternatives; signzy.com (One-Touch KYB; "10 best KYB platforms 2026"); probe42.in; companydata.com; kychub.com; befisc.com.*

---

## Where they fall short (for GeM procurement)

1. **No tender context.** They verify a company exists and is "clean" — they do **not** answer *"is this bidder eligible for THIS tender?"* (turnover threshold, MSE/MII class, OEM/MAF for the quoted brand, BIS for the product, EMD exemption eligibility).
2. **No procurement-rule engine.** None encodes GFR 2017, PPP-MII Order 2017, MSME Public Procurement Policy 2012.
3. **API-first, not officer-first.** They sell data APIs to fintechs/lenders; there is no **procurement-officer dashboard** with per-check status, red-flag timeline, and a printable audit report.
4. **No cross-bidder / cartel view.** They assess one entity; none surfaces **collusion / bid-rigging** across the bidders in a single tender.
5. **No forgery-vs-uploaded-doc focus.** GeM's core risk is self-declared uploaded PDFs; competitors assume registry lookups, not tamper detection on submitted certificates.
6. **Not "authentically GoI."** Generic SaaS look; no GIGW/UX4G institutional trust.

---

## Our differentiation (the winning wedge)

| # | PRAMAAN differentiator | Competitor equivalent |
|---|---|---|
| 1 | **Purpose-built GeM/tender eligibility engine** (maps raw KYB → this tender's rules) | None |
| 2 | **Explainable compliance score + hard vetoes + provenance-stamped audit PDF** | Raw data, no scoring/audit |
| 3 | **Cross-portal entity-resolution graph → shell/related-party/cartel detection** | Single-entity only |
| 4 | **Document forgery/tamper detection** on uploaded certificates | Registry lookups only |
| 5 | **Officer-facing dashboard** (per-check chips, red-flag timeline, side-by-side bidder comparison) | API-first |
| 6 | **Continuous monitoring / alerts** on vendor status change post-award | One-time checks |
| 7 | **Pluggable free-tier AI + live↔mock provider layer with offline fallback** | Paid enterprise APIs |
| 8 | **Authentically Government-of-India UI** (GeM navy+saffron, GIGW/WCAG) | Generic SaaS |

---

## Positioning statement

> *"PRAMAAN is not another KYB API. It is a procurement-officer's decision-support cockpit that understands GeM's own eligibility and statutory rules — combining live government-source verification, AI document forensics, and cross-bidder fraud/cartel detection into one explainable, auditable compliance verdict, while keeping the final decision with the officer."*
