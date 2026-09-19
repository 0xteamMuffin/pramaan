# Design System — "GeM-Inspired, Modern"

Authentically Government-of-India (echoing GeM's navy + saffron), yet modern and premium. Built to GIGW 3.0 / UX4G / WCAG 2.1 AA. Full rationale in [design-brand-research](../01-research/design-brand-research.md).

> **Direction in one line:** GeM navy `#05256E` + saffron `#F5821F` on clean slate surfaces, Roboto/Inter + Mukta type, a **verdict-first dashboard** (score gauge → status-chip KPI cards → provenance-stamped evidence).

---

## 1. Color tokens

### Brand core
```css
--primary:        #0B3D91;  /* buttons, links, active nav (AA-friendly navy) */
--primary-dark:   #05256E;  /* headers/footer chrome (authentic GeM navy)   */
--primary-darker: #07222E;  /* top bar / deep bg (GeM teal-navy)            */
--primary-light:  #3B6FC4;  /* hover                                        */
--primary-50:     #EAF1FB;  /* tinted surfaces, selected rows               */
--secondary:      #F5821F;  /* primary CTA accent (GeM saffron)             */
--secondary-dark: #D96C0B;  /* accent hover                                 */
--secondary-50:   #FEF1E4;  /* accent tint / badges                         */
--accent-teal:    #0FA3A3;  /* data-viz accent, "verified" emphasis         */
```

### Semantic (status) — always pair with icon + label (never color alone)
```css
--success: #1A7F37;  --success-bg: #E7F4EC;   /* Compliant / Verified / PASS */
--warning: #C77700;  --warning-bg: #FCF3E3;   /* Caution / Pending / WARN     */
--danger:  #C0392B;  --danger-bg:  #FBEAE8;   /* Non-compliant / FAIL / veto  */
--info:    #0B6FB0;  --info-bg:    #E6F1F9;   /* Informational / UNVERIFIABLE */
```

### Neutrals (slate)
```css
--ink-900:#0F172A; --ink-700:#334155; --ink-500:#64748B;
--border:#E2E8F0; --surface-2:#F1F5F9; --surface-1:#F8FAFC; --white:#FFFFFF;
```

### RAG score scale
```
0–39  High risk  #C0392B   |   40–69 Medium  #C77700   |   70–100 Low  #1A7F37   |  track #94A3B8
```

> All semantic colors meet **WCAG AA (≥4.5:1)** on white. If adopting **UX4G**, override `--ux4g-primary` toward `#0B3D91` to inherit compliant components.

---

## 2. Typography
- **UI font:** **Inter** (modern) or **Roboto** (exact GeM match).
- **Indic/bilingual:** **Mukta** / **Noto Sans Devanagari**.
- **Stack:** `"Inter","Roboto","Segoe UI",system-ui,"Noto Sans",Arial,sans-serif`.
- **Tabular numbers:** `font-variant-numeric: tabular-nums` for scores/tables.
- **Scale (8px rhythm):** 12 · 14 (base) · 16 · 20 · 24 · 32 · 40. Headings 600–700, body 400–500.

---

## 3. Spacing, radius, elevation
- **Grid:** 8px base (4px half-steps allowed).
- **Radius:** 8–12px (cards/inputs), 999px (chips/pills).
- **Elevation:** subtle — `0 1px 2px rgba(15,23,42,.06)` (cards), `0 4px 12px rgba(15,23,42,.10)` (popovers). Avoid heavy shadows/3D on data.
- **Container widths:** content max ~1200–1360px; comfortable table density.

---

## 4. Core components

| Component | Spec |
|---|---|
| **Top utility bar** | `--primary-darker` bg; "Government of India" text, language switcher, accessibility controls (A-/A/A+, contrast, dark), skip-to-content. *No Ashoka emblem — neutral wordmark.* |
| **App header** | white, sticky; PRAMAAN wordmark (navy) + saffron accent; global search; user/role. |
| **Score gauge** | radial 0–100 with RAG color; big number + band label; sub-score segmented meter below. |
| **Status chip** | pill: icon + label + color. `PASS`(✓ green) `WARN`(! amber) `FAIL`(✕ red) `UNVERIFIABLE`(? blue) `N/A`(– gray). |
| **Provenance stamp** | small caption on data: `source · method · as on <ts>` + mode badge `LIVE`/`SIMULATED`/`SNAPSHOT`. |
| **KPI card** | one number + label + trend/delta chip; consistent semantics. |
| **Evidence panel** | drill-down: what was checked, from where, the raw snippet/image (ELA heatmap, portal JSON). |
| **Entity graph** | interactive nodes/edges; bidders + shared PAN/DIN/address/bank/IP; cartel clusters highlighted. |
| **Comparison matrix** | bidders × checks grid of chips; sort by score. |
| **Audit timeline** | vertical timeline of hash-chained events with integrity badge. |
| **Tables** | sticky header, zebra rows, sortable, tabular-nums, empty/loading/error states (skeletons). |
| **Buttons** | primary (navy), accent CTA (saffron), secondary (outline), destructive (danger). Visible focus ring. |

---

## 5. Data-viz rules
- Restrained palette: one accent + 3–5 categorical colors max.
- Low chart ink, direct labels, no 3D/gradients on data.
- Score = radial gauge; sub-scores = segmented meter; trends = sparklines; history = timeline.
- Color **and** icon/text for every status (accessibility).

---

## 6. Accessibility (must-haves)
- WCAG 2.1 AA contrast (4.5:1 text, 3:1 large/UI).
- Full keyboard operability; visible focus; logical tab order; ARIA on menus/dialogs/graph.
- Labeled forms; inline error identification + suggestions; required beyond color.
- Responsive to 200% zoom / 320px width; mobile-first.
- Accessibility toolbar (font size, contrast/dark, highlight links) + skip link.
- Alt text on evidence images; graph has a table fallback.

---

## 7. Voice & copy
- Institutional, plain, confident. Reinforce **"decision-support for the officer."**
- Recommendations phrased as *"For the officer's consideration…"* — never "Rejected."
- Show provenance language: *"As on 19 Sep 2026, 10:30 — source: GSTN (sandbox)."*

## 8. Assets to produce (design phase)
- Wordmark/logo (neutral, no emblem), favicon.
- Tailwind theme config from tokens above.
- Icon set (Lucide/Feather) mapped to check types + statuses.
- Figma/screens per [dashboard-spec](dashboard-spec.md).
