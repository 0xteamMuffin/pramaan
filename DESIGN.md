# Design

Visual system for PRAMAAN. Authentic Government-of-India cues (GeM navy + saffron), rendered as a modern, premium GovTech product. Light default, dark and high-contrast supported. Full rationale in `docs/04-design/design-system.md`.

## Theme

Institutional, calm, high-trust. Deep navy authority with a warm saffron accent used sparingly for action and emphasis, teal for "verified/active" data, on clean slate-neutral surfaces. Strong typographic hierarchy and purposeful density (this is a working tool, not a marketing page inside the app). The landing page may be more expressive (brand register) while the app stays restrained (product register).

## Color

Tokens are stored in `frontend/styles/globals.css` as space-separated RGB channels and consumed through the Tailwind theme (no raw hex in components).

| Role | Token | Hex |
|---|---|---|
| Primary (action, links, active) | `--primary` | `#0B3D91` |
| Primary dark (headers, chrome) | `--primary-dark` | `#05256E` |
| Primary darker (top bar, deep bg) | `--primary-darker` | `#07222E` |
| Accent (CTA, emphasis) | `--secondary` (saffron) | `#F5821F` |
| Data / verified | `--accent-teal` | `#0FA3A3` |
| Success / PASS | `--success` | `#1A7F37` |
| Warning / WARN | `--warning` | `#C77700` |
| Danger / FAIL / veto | `--danger` | `#C0392B` |
| Info / UNVERIFIABLE | `--info` | `#0B6FB0` |
| Ink 900 / 700 / 500 | `--ink-*` | `#0F172A` / `#334155` / `#64748B` |
| Border / surfaces | `--border` / `--surface-2` / `--surface-1` | `#E2E8F0` / `#F1F5F9` / `#F8FAFC` |

**Strategy:** restrained. Tinted-navy neutrals + saffron accent under ~10% of surface. RAG scale for scores: high `#C0392B` (0-39), medium `#C77700` (40-69), low `#1A7F37` (70-100). Verify body text >= 4.5:1; never gray-on-tint for content.

## Typography

- **UI / body:** Inter (variable), tabular-nums for all figures/scores/tables.
- **Display / headings:** Inter tight (weight 600-700), letter-spacing floor -0.03em (never tighter). `text-wrap: balance` on h1-h3.
- **Indic / bilingual:** Mukta / Noto Sans Devanagari.
- Body line length capped 65-75ch. Type scale (8px rhythm): 12 / 14 (base) / 16 / 20 / 24 / 32 / 40; display hero clamp max ~3.5rem on landing.

## Components

- **Score gauge** (radial, RAG-colored), **sub-score segmented meters**, **status chips** (color + icon + label), **provenance stamp** (source · method · as-on · mode badge LIVE/SIMULATED/SNAPSHOT), **KPI stat blocks** (avoid the hero-metric-template cliche; vary layout), **evidence panel/drawer**, **entity graph**, **comparison matrix**, **audit timeline**, **data tables** (sticky header, zebra, tabular-nums, sortable).
- Cards used only where they are the right affordance; never nested. Radius 8-12px on cards/inputs, pill for chips. One border OR one <=8px shadow, never both.
- Purposeful loading (skeletons), empty, and error states everywhere.

## Layout

- App shell: slim navy top utility bar (Government of India strip, language, a11y, disclaimer) + white sticky app header (wordmark, global search, role) + left nav + content. Content max ~1280-1360px.
- Flex for 1D, Grid for 2D; responsive grids via `repeat(auto-fit, minmax(...))`. Semantic z-index scale. Responsive to 320px and 200% zoom.

## Motion

- Intentional and subtle: ease-out (quart/quint) 150-260ms; staggered list reveals where meaningful; number/gauge count-up on verdict; drawer/panel slide. No bounce/elastic. Full `prefers-reduced-motion` fallbacks (crossfade/instant). Consider `motion` (framer) for the landing hero and gauge.

## Identity

Neutral geometric wordmark "PRAMAAN" (no Ashoka emblem). A simple mark (e.g., a shield/checkmark or verification glyph in navy + saffron) is acceptable. Disclaimer "Not an official Government of India site" in the footer/top bar.
