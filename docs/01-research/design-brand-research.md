# Research — Design & Brand (GeM-Inspired, Modern, GIGW/WCAG-Compliant)

> **Goal:** a UI that feels authentically "Government of India" (echoing GeM) yet modern and premium. Anchored on GeM's real brand colors, built to GIGW 3.0 / UX4G / WCAG 2.1 AA.

---

## 1. GeM (gem.gov.in) brand identity

*Method note:* gem.gov.in is geo-blocked from many environments; colors below were extracted from GeM's **production stylesheet** (`assets-bg.gem.gov.in/resources/css/custom-v145.css`) + homepage HTML via Wayback Machine, plus official logo assets.

- **Font:** **Roboto** (Bootstrap layout).
- **Logo:** wordmark "GeM" + a **multicolored star** (diversity/inclusion). Tagline **"Efficient. Transparent. Inclusive."**
- **Chrome:** white sticky header + logo + centered product search; **dark teal-navy top bar + dark footer**; 12-language selector, dark-mode toggle, A-/A/A+ controls, "Skip to Main Content".

**Core brand hex (from live CSS):**
| Role | Hex | Where |
|---|---|---|
| **Primary navy** | `#05256E` | Headings, links, titles |
| Secondary blue | `#093385` | Search band, active tabs |
| Link blue | `#0F45AF` | Contact text |
| **Dark teal-navy** | `#07222E` | Top bar, footer, dropdowns |
| **Signature orange/saffron** | `#F5821F` (`#F6821F`) | Buttons, search, active/hover, highlights |
| Alert red | `#EC3400` / `#FF5722` | Carets, alert borders |
| Body text | `#4A4A4A` · Light surface `#F8F8F8` | |

**Identity signal:** deep institutional **navy `#05256E` + energetic saffron `#F5821F`**, near-black teal-navy chrome, multicolor star accent. Navy+saffron = the "authentically GoI" cue to echo.

---

## 2. Government of India digital standards

- **GIGW 3.0** (guidelines.india.gov.in) — NIC/MeitY; STQC "Certified Quality Website" (CQW). Mandates semantic markup, accessible forms, alt text, standard GoI header/footer, website policies, and **UUU** (Usable, User-centric, Universally accessible) + built-in accessibility toolbar.
- **UX4G Design System 3.0** (ux4g.gov.in) — India's **official government design system**. 40+ components for HTML/React/Angular/Flutter/RN, Figma kit, design tokens. **WCAG 2.1 AA + GIGW + DBIM** compliant. Primary token `--ux4g-primary: #4A2BC2` (violet). **Fastest route to "government-ready + compliant."**
- **WCAG 2.1 AA:** contrast ≥ 4.5:1 (text) / 3:1 (large & UI), keyboard operable, visible focus, labeled forms + error ID, alt text, 200% zoom, **never color-alone**.
- **Ashoka State Emblem:** protected by the State Emblem of India Act 2005 — since our product is **not** an official GoI site, **avoid the emblem**; use a neutral wordmark.
- **Standard chrome:** flag + "Government of India", language switcher, accessibility controls, "Skip to main content"; footer with owning dept, "hosted by NIC/MeitY", policies, last-updated date.

---

## 3. Reference palettes of related GoI portals
| Portal | Primary | Accent | Font |
|---|---|---|---|
| **GeM** | navy `#05256E` | orange `#F5821F`; chrome `#07222E` | Roboto |
| Udyam/MSME | navy `#0C2340`/`#1A2F6B` | orange `#F58220` | Segoe UI |
| GST | blue `#2C4E86`/`#18436B` | light blue `#A9CEF3` | Helvetica |
| Income Tax | blue `#076BCF` | dark-mode yellow | Bootstrap stack |
| DigiLocker | `#0052CC` | Bootstrap blues (built on UX4G) | Bootstrap 5 |
| UX4G (national) | violet `#4A2BC2` | token-driven | system stack |

**Common grammar:** blue/navy primary + warm saffron accent, light gray/near-white surfaces, Roboto/Mukta/Inter/system fonts.

---

## 4. Premium compliance-dashboard principles
- **Answer-first:** lead with the single verdict — overall **score (0–100)** or **RAG hero** — then KPIs, then detail. Don't make the user assemble the conclusion.
- **Scannable KPI cards:** one number + label + trend chip; consistent color semantics; whitespace.
- **Progressive disclosure:** summary → drill-down (Summary Box / Alert / Accordion).
- **Data-viz:** score gauge/radial for headline; segmented meter for sub-scores; **status chips (Verified ✓ / Pending / Failed / Not Found) = color + icon + text** (never color alone); sparklines for trends; sortable sticky tables; audit timeline.
- **Trust signals:** show **provenance** — source ("MCA"/"GSTN"/"GeM"), **timestamp** ("as on 19/09/2026 10:30"), method — on every data point. Biggest credibility multiplier.
- **Polish:** consistent elevation, 8px grid, strict type scale, purposeful empty/loading/error states, downloadable/printable **audit PDF**.
- **Reference systems:** USWDS (designsystem.digital.gov) primary `#005EA2`, red `#D83933`, green `#538200`, gold `#FFBE2E`; GOV.UK (plain-language, task-focused).

---

## 5. Proposed palette — "GeM-inspired, modern" (WCAG-AA on white)

### Brand core
| Token | Hex | Use |
|---|---|---|
| `--primary` | `#0B3D91` | Buttons, links, active nav (AA-friendly evolution of GeM navy) |
| `--primary-dark` | `#05256E` | Headers, footer chrome (authentic GeM navy) |
| `--primary-darker` | `#07222E` | Top bar / deep bg (GeM teal-navy) |
| `--primary-light` | `#3B6FC4` | Hover |
| `--primary-50` | `#EAF1FB` | Tinted surfaces, selected rows |
| `--secondary` | `#F5821F` | Primary CTA accent (GeM saffron) |
| `--secondary-dark` | `#D96C0B` | Accent hover |
| `--secondary-50` | `#FEF1E4` | Accent tint/badges |
| `--accent-teal` | `#0FA3A3` | Data-viz accent, "verified" emphasis |

### Semantic (status)
| Token | Hex | Meaning |
|---|---|---|
| `--success` / bg | `#1A7F37` / `#E7F4EC` | Compliant / Verified |
| `--warning` / bg | `#C77700` / `#FCF3E3` | Caution / Pending / Amber |
| `--danger` / bg | `#C0392B` / `#FBEAE8` | Non-compliant / Red flag |
| `--info` / bg | `#0B6FB0` / `#E6F1F9` | Informational |

### Neutrals (slate) & RAG gauge
`--ink-900 #0F172A` · `--ink-700 #334155` · `--ink-500 #64748B` · `--border #E2E8F0` · `--surface-2 #F1F5F9` · `--surface-1 #F8FAFC` · white.
RAG: `#C0392B` (0–39 High) → `#C77700` (40–69 Medium) → `#1A7F37` (70–100 Low), neutral track `#94A3B8`.

> Tip: build on **UX4G tokens** and override `--ux4g-primary` toward this navy to inherit GIGW/WCAG components free.

---

## 6. Fonts
- **UI:** **Inter** (modern) or **Roboto** (exact GeM match). Roboto = authentic; Inter = slightly more modern for dashboards.
- **Indic/bilingual:** **Mukta** or **Noto Sans Devanagari**.
- **Data:** `font-variant-numeric: tabular-nums` so scores/figures align.
- **Stack:** `"Inter","Roboto","Segoe UI",system-ui,"Noto Sans",Arial,sans-serif`.
- **Scale (8px rhythm):** 12 / 14 (base) / 16 / 20 / 24 / 32 / 40; headings 600–700, body 400–500.

---

## 7. GIGW / accessibility checklist
WCAG 2.1 AA contrast; color+icon+label (never color alone); GoI chrome (flag + "Government of India", language switcher, accessibility toolbar, skip link); full keyboard + visible focus + ARIA; labeled forms + inline errors; responsive to 200%/320px; website policies + "Last Updated" + data-source attribution; **no Ashoka emblem** (2005 Act); target STQC CQW bar; fastest compliant build = adopt UX4G components.

**One-line direction:** UX4G/GIGW components + GeM navy `#05256E` + saffron `#F5821F` on clean slate surfaces, Roboto/Inter + Mukta, **verdict-first dashboard** (score gauge → status-chip KPI cards → provenance-stamped evidence tables) → authentically GoI yet distinctly modern.

## Sources
GeM CSS via Wayback (`assets-bg.gem.gov.in/resources/css/custom-v145.css`); GeM logo/brand pages; GIGW 3.0 (guidelines.india.gov.in) + STQC; UX4G (ux4g.gov.in, doc.ux4g.gov.in); GST/IncomeTax/DigiLocker/Udyam page CSS; USWDS (designsystem.digital.gov); GOV.UK Design System; State Emblem of India Act 2005.
