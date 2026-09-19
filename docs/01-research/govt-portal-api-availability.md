# Research — Government Portal / API Availability: What's REAL vs What We MOCK

> **Purpose:** Know EXACTLY which government verification data we can integrate (free / sandbox / public / via aggregators) vs which we must faithfully **mock/simulate** because they require official government access unavailable to a student team. Honest assessment — this holds up to judge scrutiny.
> **Currency:** researched 2026; re-verify free-tier terms before demo.

---

## TL;DR for the demo

- **Truly integrable with a free sandbox in a hackathon:** GSTIN, PAN, PAN–Aadhaar link, MCA (CIN/DIN), Bank penny-drop, IFSC, DigiLocker pull, and (usually) Udyam — all via **aggregator sandboxes** (Sandbox.co.in / Cashfree / Surepass), **not** direct government APIs.
- **No direct government API obtainable as students:** GSTN's own API needs a **GSP license**; NSDL/Protean PAN API needs an authorized-entity agreement; DigiLocker needs **org onboarding**; MCA has no open API; EPFO/ESIC/NSIC/BIS/Startup-India/GeM have **no public API at all**.
- **MOCK these** (no realistic access): EPFO/ESIC, NSIC, BIS/ISI, Startup India DPIIT, GeM seller/OEM, and blacklist/debarment (data exists on public web pages but is **CAPTCHA-gated with no API** → scrape a snapshot or mock).

---

## MASTER TABLE

| # | Portal / Check | Official API? | Aggregator options | Free tier / sandbox? | Data returned | Recommendation |
|---|---|---|---|---|---|---|
| 1 | **Udyam / MSME** | ❌ web "Verify" only; consent cert via EntityLocker (API Setu) | Surepass, Sandbox (EntityLocker), Zoop, Deepvue, Gridlines | ⚠️ Partial (Sandbox/Surepass sandbox) | Udyam no., name, type (Micro/Small/Med), NIC codes, address, dates | **REAL via aggregator** if credits allow, else MOCK |
| 2 | **GST (GSTIN/taxpayer/returns)** | ✅ GSTN developer portal — **GSP-only**. Public Search = web + CAPTCHA | Sandbox, Cashfree, Surepass, Setu, Zoop, Deepvue, Gridlines | ✅ **Yes** (Sandbox `test-api.sandbox.co.in`, Cashfree credits) | Legal/trade name, status, reg date, type, constitution, jurisdiction, addr, **GSTR-1/3B filing** | **REAL integration** (strongest legit live check) |
| 3 | **PAN + PAN–Aadhaar link** | ✅ Protean/UTIITSL — **authorized entities only** | Sandbox, Cashfree, Surepass, Setu, Zoop | ✅ **Yes** | PAN status, name-match, category, Aadhaar-link status | **REAL via aggregator sandbox** |
| 4 | **MCA21 (CIN/DIN)** | ❌ no open API; free public web master-data lookup | Sandbox (Company/Director Master Data), Surepass | ✅ **Yes** (Sandbox test env) | Company name, CIN, ROC, status, capital, incorp date, directors/DIN | **REAL via Sandbox** (or scrape MCA web) |
| 5 | **DigiLocker (API Setu / Meripehchaan)** | ✅ Requester/Issuer APIs — **partner org onboarding** | Sandbox, Setu, Surepass, Gridlines, Deepvue (wrap it) | ⚠️ Official org-only; **aggregator sandbox = shortcut** | Aadhaar XML, PAN, DL; EntityLocker → GST/Udyam | **REAL via aggregator**; direct onboarding unrealistic |
| 6 | **EPFO establishment** | ❌ no official API; web Establishment Search | Surepass (Passbook), Karza/Perfios, Signzy | ⚠️ rare/enterprise, KYC-gated | Establishment name, UAN, contributions | **MOCK** (optionally scrape a snapshot) |
| 7 | **ESIC** | ❌ no official API; web employer/IP search | Karza/Perfios, Signzy (enterprise) | ❌ | Employer code, coverage status | **MOCK** |
| 8 | **Startup India / DPIIT** | ❌ free web verify by recognition no. | none mainstream | ❌ | DPIIT no., entity name, validity | **MOCK** (or headless-scrape verify page) |
| 9 | **NSIC** | ❌ cert-based, no API | none mainstream | ❌ | Reg no., monetary limit, validity, store items | **MOCK** |
| 10 | **BIS / ISI / CRS** | ❌ BIS Care app + manakonline web search | none mainstream | ❌ | Licence no., firm, product, IS std, validity | **MOCK** (BIS Care app for real check) |
| 11 | **Blacklist / Debarment** | ❌ CPPP Debarred search (CAPTCHA), World Bank list (public) | AML tools bundle global lists | ⚠️ AML free trials | Firm/individual, grounds, period, order no. | **Scrape snapshot → local dataset** (World Bank + CPPP) + AML trial |
| 12 | **GeM seller / OEM** | ❌ no public API (buyer/PSU-only) | none public | ❌ | Seller, OEM status, catalog | **MOCK** |
| 13 | **API Setu** | ✅ real, but verification APIs **gov/approved-requester only** | it IS the source aggregators resell | ⚠️ account + approval | DigiLocker, Meripehchaan, sectoral | **Use DigiLocker via aggregator**; cite as authoritative source layer |

---

## Aggregator free-tier / sandbox scorecard

| Aggregator | Sandbox / test env | Self-serve signup? | Notes |
|---|---|---|---|
| **Sandbox.co.in (Quicko)** | ✅ `test-api.sandbox.co.in` (`key_test`/`secret_test`); Postman collections | ✅ Yes | **Best for students.** KYC (Aadhaar OKYC, PAN, PAN-Aadhaar), MCA, GST public, bank penny-drop, DigiLocker/EntityLocker. 200+ APIs. |
| **Cashfree Verification Suite** | ✅ Test env + free credits on signup | ✅ Yes | PAN, GSTIN, bank penny-drop/-less, UPI, Aadhaar. Strong free onboarding. |
| **Surepass** | ✅ sandbox, 300+ APIs; key issuance sales-assisted | ⚠️ Partial | Broadest catalog incl. Udyam, MCA filed-docs, EPFO passbook. |
| **Setu** | ✅ Bridge console sandbox | ⚠️ mostly sales-led | PAN, Aadhaar Lite, DigiLocker, GST, Account Aggregator. |
| **Gridlines (OnGrid)** | ✅ sandbox | ⚠️ book-demo | Identity/KYB, DigiLocker, Aadhaar OVSE. |
| **Deepvue / Zoop.one** | ⚠️ demo-led | ❌ | KYC/KYB, DigiLocker, sanctions/PEP. |
| **IDfy / Karza(Perfios) / Signzy** | ❌ enterprise, sales-only | ❌ | Deepest coverage (EPFO/ESIC) but not student-accessible. |

---

## Blacklist / Debarment — the key differentiator (detail)

The PS explicitly requires blacklisting/debarment detection, and this is where we can shine because the **data is public** even if there's no API:

- **CPPP (eprocure.gov.in)** — real Debarment section: [Debarred Bidders Search](https://eprocure.gov.in/cppp/debarmentlistsearch) (org name, tender category, **PAN/TAN**, product category), [Debarred List Archive](https://eprocure.gov.in/cppp/debarredbidderlist), [Revocation list](https://eprocure.gov.in/cppp/revocationdebarment). CAPTCHA-gated, no API.
- **World Bank** — [Listing of Ineligible (Debarred & Cross-Debarred) Firms & Individuals](https://www.worldbank.org/en/projects-operations/procurement/debarred-firms), public searchable, **updates every 3 hrs**, scrapeable (name, address, grounds, period). Cross-debarment covers ADB, EBRD, IADB, AfDB.
- **Other:** GeM internal debarment (no public API), MCA "struck-off companies" (downloadable), SEBI debarred-entity orders, RBI/CVC caution lists.

**Our approach:** scrape once → build a local searchable `/debarment/search` API with **fuzzy matching on name + PAN + CIN + DIN** (to defeat re-incorporation). Legitimate, impressive, demoable, and doesn't depend on a gated live API. We honestly note the CAPTCHA limitation.

---

## Recommended integration architecture

1. **One `VerificationProvider` interface** per check, with two implementations: `LiveAdapter` (aggregator sandbox) + `MockAdapter` (deterministic fixtures). **Toggle via config** so judges can see both live and mock.
2. **Go LIVE (via Sandbox.co.in, Cashfree fallback):** GSTIN + returns, PAN + Aadhaar link, MCA CIN/DIN, bank penny-drop, DigiLocker pull, Udyam.
3. **MOCK with realistic JSON** (mirror real field names from aggregator docs): EPFO, ESIC, NSIC, BIS/ISI, Startup India, GeM seller/OEM.
4. **Debarment:** scrape World Bank + CPPP archive → local table + fuzzy search API.
5. **Honesty line for the deck:** *"Government verification data is real but gated behind GSP/authorized-entity licensing and org-only DigiLocker onboarding; in production we integrate the same government sources via RBI/GSTN-regulated aggregators, and mock the checks that have no programmatic access (EPFO/ESIC/BIS/NSIC/GeM)."*

> See [`docs/03-architecture/provider-abstraction.md`](../03-architecture/provider-abstraction.md) for the concrete adapter design and config.
