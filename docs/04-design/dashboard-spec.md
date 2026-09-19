# Dashboard UX Spec (screen-by-screen)

Verdict-first, evidence-backed, officer-in-control. Screens ordered by the officer's real workflow. Component vocabulary from [design-system](design-system.md).

---

## Global chrome (all screens)
- **Top utility bar:** "Government of India" · language switcher · accessibility controls · skip link. (No Ashoka emblem.)
- **App header:** PRAMAAN wordmark · global search (bidder/tender/PAN/GSTIN) · role badge · user menu.
- **Left nav:** Dashboard · Tenders · Bidders · Debarment Search · Providers · Audit · Reports · Admin.
- **Everywhere:** provenance stamps + mode badges (`LIVE`/`SIMULATED`/`SNAPSHOT`).

---

## 1. Home / Overview
- **KPI cards:** tenders in evaluation, bidders pending, avg compliance score, red-flag count, **time saved (manual vs PRAMAAN)**.
- Recent verification runs (status chips).
- Alerts feed (new debarment matches, forgery flags, cartel detections).

## 2. Tenders list
- Table: ref no, title, buyer, value, status, #bidders, #high-risk. Sort/filter.
- CTA: **New Tender** (from template).

## 3. Tender detail
- Header: tender meta + rule summary (turnover, MSE/MII, OEM, BIS, EMD).
- **Bidder comparison matrix:** rows = bidders, columns = checks → status chips; last column = score + RAG. Sortable by score.
- Buttons: **Evaluate all** · **Entity graph (cartel view)** · **Export summary**.
- Requirements editor (Admin/Officer): `check_key` → params + mandatory + weight.

## 4. Bidder verdict (the hero screen) — verdict-first
Layout top→bottom (progressive disclosure):
1. **Verdict banner:** big **score gauge** + **RAG band** + one-line AI recommendation stance (advisory) + **"Record Decision"** button (Officer only).
2. **Top reasons:** 3–5 chips (vetoes first): e.g., `VETO Debarment match`, `WARN Udyam name mismatch`, `UNVERIFIABLE ESIC`.
3. **Sub-score meters:** the 6 dimensions with weights.
4. **Checks list (accordion):** each of the 13+ checks → status chip + summary + **provenance stamp**; expand → **evidence panel** (portal JSON, extracted fields, forensic heatmap, graph snippet).
5. **Documents:** thumbnails + doc-type + extraction confidence + forensic verdict.
6. **AI recommendation panel:** rationale grounded in evidence with clickable evidence links + model/provider used. Clearly labeled *"Advisory — the officer decides."*
7. **Decision area:** Officer records QUALIFIED / DISQUALIFIED / ON_HOLD + note → written to audit.

## 5. Evidence drill-down (modal/side-panel)
- What was checked · compared values · source · method · timestamp · confidence.
- For forgery: metadata diff table + ELA heatmap image + matched copy-move regions.
- For cross-check: side-by-side field comparison (declared vs PAN vs GST vs Udyam vs MCA) with match scores.

## 6. Entity graph (cartel / related-party view)
- Interactive graph: bidder nodes + shared PAN/DIN/address/bank/IP.
- Cartel clusters highlighted; click an edge → why (shared attribute + evidence).
- **Table fallback** for accessibility.

## 7. Debarment search
- Search by name/PAN/CIN/DIN → fuzzy matches from snapshot (source + capture date shown).
- Match detail: grounds, period, source.

## 8. Providers (config + live demo toggle)
- Per check: current chain, mode (`live`/`mock`/`snapshot`), health, last latency.
- **Toggle mode** (Admin) — flip GST live↔mock on stage.
- **Global Offline switch** — forces local AI + mock/snapshot.

## 9. Audit log
- Hash-chained timeline; filter by target/actor/date.
- **Verify integrity** button → green "chain intact" / red "broken at seq N".
- Export.

## 10. Reports
- Per-bid **audit report (PDF)**: bidder, tender, all checks + verdicts + evidence provenance, score breakdown, AI recommendation, officer decision, audit hash. One-click download.

---

## Signature "wow" moments to design for
1. **Forgery reveal:** upload a tampered certificate → forensic panel lights up with heatmap + metadata diff.
2. **Cross-portal catch:** PAN/name mismatch surfaced automatically with side-by-side evidence.
3. **Cartel graph:** two "competing" bidders visibly linked by shared director + bank + IP.
4. **Live→mock→offline toggle:** flip providers on stage; everything keeps working.
5. **Time-savings meter:** "Manual ≈ 3–4 hrs/bidder → PRAMAAN ≈ 90 sec."

## States & empties (design on purpose)
- Loading: skeleton shimmers (never blank).
- Empty: "No bidders yet — add one to begin."
- Error vs Unverifiable: distinct visuals; unverifiable routes to "needs manual review," not failure.
