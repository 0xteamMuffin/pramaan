# Synthetic Dataset Spec (Dummy Bidders & Tenders)

No official dataset is provided, so we design a **realistic synthetic dataset** with **planted frauds** that our engine must catch. All data is fake but **format-valid** (regex-passing). Nothing real; no real PII.

> Generators live in `data/generators/`; fixtures in `data/fixtures/`; blacklist snapshots in `data/blacklists/`.

---

## 1. Design goals
- **Format-valid IDs** (PAN/GSTIN/Udyam/CIN/DIN/etc.) so extraction + regex validation exercise real logic.
- **Cross-linked** across portals (PAN as join key) so consistency checks are meaningful.
- **Planted frauds** covering every detector (forgery, mismatch, debarment, shell, cartel, expiry).
- **Deterministic** (fixed seed) → reproducible demos + regression tests.
- **A range of outcomes** (clean LOW-risk, borderline MEDIUM, fraudulent HIGH).

---

## 2. ID generation rules (format-valid, fake)
| ID | Rule |
|---|---|
| PAN | `[A-Z]{5}[0-9]{4}[A-Z]`; 4th char encodes type (P=individual, C=company, F=firm, etc.) — **used intentionally** for the constitution-mismatch fraud |
| GSTIN | `SS` + `PAN` + entity-no + `Z` + checksum; **embed the bidder's PAN** in chars 3–12 (so mismatches are plantable) |
| Udyam | `UDYAM-SS-DD-NNNNNNN` |
| CIN | `[LU]#####SSYYYY[A-Z]{3}######`; **year** planted for shell/vintage fraud |
| DIN | 8-digit; **shared across bidders** for related-party rings |
| EPFO | region/office/est code · ESIC 17-digit · DPIIT `DIPP#####` · BIS `CM/L-#######` / `R-##########` |

Names, addresses, phones, emails, banks generated from pools; **deliberately shared** among cartel members.

---

## 3. Tenders (at least 3)
| Tender | Type | Key rules (planted to exercise logic) |
|---|---|---|
| **T1 — Industrial pumps supply** (goods, ~₹3.2 cr) | Goods | turnover ≥ ₹2 cr/3yr, **MII Class-I**, OEM/MAF for quoted brand, BIS for product, EMD (MSE exempt) |
| **T2 — Facility management services** (services, ~₹1.1 cr) | Services | turnover ≥ ₹80 L, **EPFO+ESIC mandatory**, GST returns, MSE preference on |
| **T3 — IT hardware** (goods, ~₹60 L) | Goods | **MII Class-II**, BIS CRS, Startup exemption allowed, debarment strict |

---

## 4. Bidders & planted frauds (the demo gold)

Design **~4 bidders per tender**, spanning outcomes. Core cast (reused across tenders where sensible):

| Bidder | Profile | Planted issue(s) | Should trigger |
|---|---|---|---|
| **B1 — Aarav Pumps Pvt Ltd** | Clean, genuine Small enterprise | none | 🟢 LOW — baseline "good" |
| **B2 — Bharat Micro Traders** | Claims **Micro/MSE** | Turnover/GST scale inconsistent with "Micro"; **Udyam name ≠ PAN name** | WARN classification + name-mismatch → MEDIUM |
| **B3 — Chola Infra LLP** | Reseller quoting a brand | **Forged/expired OEM MAF** (tampered PDF) + **BIS number belongs to another brand** | Forgery veto + BIS mismatch → HIGH |
| **B4 — Deccan Supplies** | Looks normal | **PAN on GST ≠ PAN on Udyam** (identity fraud); GST **cancelled** | PAN-mismatch veto + inactive-GST veto → HIGH |
| **B5 — Everest Enterprises** | New entity | **CIN incorporation year 2026** but claims 5-yr experience; **no EPFO/ESIC footprint** (shell) | Shell signals + experience fail → HIGH |
| **B6 — Falcon Services** & **B7 — Garuda Facilities** | Two "competitors" in T2 | **Shared director DIN + address + bank + submission IP**; near-identical pricing | Cartel/related-party graph → HIGH for both |
| **B8 — Hind Startup Labs** | DPIIT startup in T3 | Valid startup, claims exemption on **resold** (non-innovative) item | WARN — exemption scope check |
| **B9 — Indus Corp** | Otherwise ok | **Director DIN matches debarment snapshot** | Debarment veto → HIGH |

> Each planted fraud maps to a specific detector in [ai-verification-engine](../03-architecture/ai-verification-engine.md) / [compliance-engine](../03-architecture/compliance-engine.md).

---

## 5. Documents (synthetic certificates)
Generate simple certificate-style PDFs/images per bidder (Udyam, GST, PAN, MAF, BIS, ISO, turnover CA cert). Include:
- **Clean** versions for good bidders.
- **Tampered** versions for B3/B4 (edit text after "signing" → PDF incremental-update; paste a seal → copy-move; splice a number → ELA-detectable) so forgery detection has real targets.
- Some **DigiLocker-signed** (mock) to contrast with uploaded PDFs.

---

## 6. Blacklist / debarment snapshots (`data/blacklists/`)
- **World Bank** debarred-firms snapshot (scraped once → CSV/JSON, with capture date).
- **CPPP** debarred-list archive snapshot.
- A few **planted** entries whose name/PAN/CIN/DIN match B9 (and a director of B3) so screening fires.
- Each record: `source, entity_name, pan?, cin?, din?, grounds, from_date, to_date, captured_at`.

---

## 7. Generator design (`data/generators/`)
- `gen_ids.py` — format-valid PAN/GSTIN/Udyam/CIN/DIN/... (seeded).
- `gen_bidders.py` — build the cast above with cross-linked identifiers + planted issues via a declarative spec.
- `gen_documents.py` — render certificate PDFs/images; produce tampered variants.
- `gen_tenders.py` — the 3 tenders + rule sets.
- `seed.py` — load everything into Postgres for the demo (idempotent).
- **Single seed** so runs are reproducible; a `--reset` flag re-seeds clean for repeat demos.

---

## 8. Expected outcomes table (golden file for tests)
| Bidder | Expected band | Must-fire signals |
|---|---|---|
| B1 | LOW | none |
| B2 | MEDIUM | classification WARN, name-mismatch |
| B3 | HIGH | forgery veto, BIS mismatch |
| B4 | HIGH | PAN-mismatch veto, GST cancelled |
| B5 | HIGH | shell/vintage, experience fail |
| B6/B7 | HIGH | cartel/related-party |
| B8 | MEDIUM | startup-scope WARN |
| B9 | HIGH | debarment veto |

This table doubles as the **regression test oracle** (with mock providers, results are deterministic).
