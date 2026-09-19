# Frontend — Next.js (PRAMAAN)

Officer-facing dashboard. Verdict-first, GeM-inspired, WCAG 2.1 AA. To be scaffolded in Phase 3 (see [`docs/02-planning/roadmap.md`](../docs/02-planning/roadmap.md)).

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Design tokens from [`docs/04-design/design-system.md`](../docs/04-design/design-system.md)
- Data-viz: Recharts/visx (gauge, meters, sparklines); Cytoscape.js / react-force-graph (entity graph)
- Data: TanStack Query against the FastAPI OpenAPI client; Zod for validation

## Planned structure
```
frontend/
├── app/                # routes: /, /tenders, /tenders/[id], /bidders/[id],
│                       #         /debarment, /providers, /audit, /reports, /admin
├── components/         # design-system components (chips, gauge, evidence panel, graph)
├── lib/                # api client, formatters (mask PAN/GSTIN), provenance helpers
├── styles/             # tailwind theme from design tokens
└── public/             # neutral wordmark/logo (NO Ashoka emblem)
```

## Screens
See [`docs/04-design/dashboard-spec.md`](../docs/04-design/dashboard-spec.md). The bidder **verdict view** is the hero screen.

## Accessibility
GIGW/WCAG must-haves: color+icon+label for all statuses, keyboard + focus, labeled forms, accessibility toolbar, skip link, 200% zoom. Build on UX4G components where practical.
