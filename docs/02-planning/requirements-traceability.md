# Requirements Traceability Matrix

Maps every PS-26100 required capability to concrete features, backend components, data sources, and the demo moment that proves it. Use this as the judge-facing "we covered everything" checklist.

**Legend — Data source:** 🟢 LIVE (aggregator sandbox) · 🟡 SIMULATED (faithful mock) · 🔵 SNAPSHOT (scraped public dataset) · ⚙️ COMPUTED (our engine).

| # | PS Requirement | Feature / Module | Component | Source | Proves it (demo) |
|---|---|---|---|---|---|
| 1 | Integrate with government portals/databases | Provider layer (live↔mock toggle, fallback chain) | `providers/government/*` | 🟢🟡🔵 | Toggle GST check live → mock on stage |
| 2 | Verify Udyam/MSME + statutory registrations | Udyam check + classification validation | `providers/government/udyam`, `compliance/checks/udyam` | 🟢/🟡 | Show Micro claim vs actual turnover flag |
| 3 | Verify GST registration + return filing | GSTIN validity + GSTR-1/3B history | `providers/government/gst` | 🟢 | Active GSTIN + last 12 filings timeline |
| 4 | Verify PAN + Income-Tax compliance | PAN validity + Aadhaar link + category match | `providers/government/pan` | 🟢 | PAN category ≠ claimed constitution → flag |
| 5 | Make-in-India / local content | PPP-MII Class-I/II logic + LC% + CA/CS cert | `compliance/checks/mii` | ⚙️🟡 | Class-I claim on imported goods → flag |
| 6 | EPFO/ESIC where applicable | Establishment code checks (tender-conditional) | `providers/government/epfo`,`esic` | 🟡 | Services tender → EPFO required, missing → WARN |
| 7 | Startup India, NSIC, OEM authorization | DPIIT recognition, NSIC SPRS, OEM/MAF validation | `compliance/checks/{startup,nsic,oem}` | 🟡 | Forged/expired MAF detected |
| 8 | DigiLocker / document verification | Issuer-signed pull + OCR extraction + forgery | `providers/government/digilocker`, `ai/extraction`, `ai/forgery` | 🟢/🟡 + ⚙️ | Tampered PDF → forgery evidence panel |
| 9 | Blacklisting & debarment | Fuzzy screening (name/PAN/CIN/DIN) across lists | `services/debarment`, `data/blacklists` | 🔵 | Bidder matches debarred entity → veto |
| 10 | Other statutory & tender-specific | Tender rule engine (turnover, experience, EMD, ATC) | `compliance/rules`, `compliance/tender` | ⚙️ | Turnover below threshold → auto-flag |
| 11 | AI: missing/inconsistent/non-compliant | AI cross-verification + entity-resolution graph | `ai/crosscheck`, `ai/graph` | ⚙️ | Cross-portal name mismatch surfaced |
| 12 | Overall Compliance Score & Risk Level | Weighted explainable score + vetoes + RAG | `compliance/scoring` | ⚙️ | Score 100→drops with reason breakdown |
| 13 | AI recommendation to officer | Recommendation engine w/ rationale + evidence | `ai/recommendation` | ⚙️ | "Recommend: further scrutiny — 3 reasons" |
| 14 | Auditable record | Hash-chained immutable audit + PDF export | `services/audit` | ⚙️ | Show tamper-evident log + export PDF |

---

## Coverage guarantees

- **Every requirement (1–14) has an owning module and a demo moment.** No requirement is "documentation-only."
- **Data-source honesty:** each check renders a badge (`LIVE` / `SIMULATED` / `SNAPSHOT`) so judges always know what's real.
- **Officer-in-control (cross-cutting):** the platform never auto-disqualifies; requirement #13 outputs a *recommendation*, and the decision action is a human step logged under #14.

## Key capabilities (PS §"Key Capabilities") → coverage
| Capability | Covered by requirements |
|---|---|
| Multi-Portal Integration | 1–9 |
| AI Document Verification | 8, 11 |
| Automated Compliance Engine | 2–7, 10 |
| Risk & Compliance Scoring | 12 |
| AI Recommendation Engine | 11, 13 |
| Audit Trail & Dashboard | 14 + all (dashboard surfaces every check) |
