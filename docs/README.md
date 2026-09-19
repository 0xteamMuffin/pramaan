# PRAMAAN — Documentation Index

This is the knowledge base for the **AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement** (SIH 2025, PS 26100). Read top to bottom for a full understanding, or jump to what you need.

> All research is source-cited. Policy thresholds (turnover caps, MII %, preference margins) change with government circulars — always re-verify against the latest DPIIT/DoE/MSME notifications and the live GeM GTC before hard-coding rules.

---

## 00 · Problem Statement
| Doc | What's in it |
|---|---|
| [problem-statement.md](00-problem-statement/problem-statement.md) | Original PS text, decomposition of the 14 requirements, key capabilities, expected impact, and our reading of what "winning" requires. |

## 01 · Research (deep, sourced)
| Doc | What's in it |
|---|---|
| [gem-procurement-compliance.md](01-research/gem-procurement-compliance.md) | How GeM procurement works end-to-end; every compliance area explained; ID formats & regex; fraud patterns; scoring theory; governing rules (GFR/PPP-MII/MSME). |
| [govt-portal-api-availability.md](01-research/govt-portal-api-availability.md) | The reality of what we can integrate vs must mock: official APIs, aggregator sandboxes, free tiers, blacklist data sources. Master table + honest verdicts. |
| [ai-provider-research.md](01-research/ai-provider-research.md) | Free/low-cost LLM, OCR, embeddings, vector DB, forgery-detection options (2026-current), with limits and a recommended pluggable stack. |
| [design-brand-research.md](01-research/design-brand-research.md) | GeM brand palette (exact hex), GIGW/UX4G/WCAG standards, GoI portal palettes, dashboard design principles. |
| [competitor-analysis.md](01-research/competitor-analysis.md) | KYB/due-diligence landscape (Karza, Signzy, Probe42, Tofler…) and our differentiation gap. |

## 02 · Planning
| Doc | What's in it |
|---|---|
| [vision-and-goals.md](02-planning/vision-and-goals.md) | Product vision, naming, personas, success metrics, guiding principles. |
| [requirements-traceability.md](02-planning/requirements-traceability.md) | Every one of the 14 PS requirements mapped to concrete features & components (traceability matrix). |
| [feature-list.md](02-planning/feature-list.md) | Full feature catalogue: MVP core + standout "wow" features, prioritized (MoSCoW). |
| [roadmap.md](02-planning/roadmap.md) | Phased build plan with milestones and a hackathon-friendly timeline. |
| [risks-and-mitigations.md](02-planning/risks-and-mitigations.md) | Technical, demo, and judging risks + how we neutralize each. |

## 03 · Architecture
| Doc | What's in it |
|---|---|
| [system-architecture.md](03-architecture/system-architecture.md) | High-level architecture, components, data flow, deployment view. |
| [tech-stack.md](03-architecture/tech-stack.md) | Concrete stack choices + rationale. |
| [data-model.md](03-architecture/data-model.md) | Core entities & schema (tenders, bidders, checks, evidence, scores, audit). |
| [compliance-engine.md](03-architecture/compliance-engine.md) | The rules + scoring engine: check taxonomy, weights, vetoes, RAG bands. |
| [ai-verification-engine.md](03-architecture/ai-verification-engine.md) | Document extraction, cross-verification, entity graph, forgery, recommendations. |
| [provider-abstraction.md](03-architecture/provider-abstraction.md) | The pluggable government + AI provider layer (live↔mock, fallback chains). |
| [api-design.md](03-architecture/api-design.md) | REST API surface (endpoints, payloads). |
| [security-and-audit.md](03-architecture/security-and-audit.md) | AuthZ/roles, PII handling, hash-chained audit trail, DPDP-alignment. |

## 04 · Design
| Doc | What's in it |
|---|---|
| [design-system.md](04-design/design-system.md) | Color tokens (GeM-inspired), typography, components, accessibility rules. |
| [dashboard-spec.md](04-design/dashboard-spec.md) | Screen-by-screen UX spec for the officer-facing dashboard. |

## 05 · Data
| Doc | What's in it |
|---|---|
| [dummy-dataset-spec.md](05-data/dummy-dataset-spec.md) | Design of realistic synthetic bidders & tenders (incl. planted frauds) for demo. |

## 06 · Demo
| Doc | What's in it |
|---|---|
| [demo-script.md](06-demo/demo-script.md) | The winning demo narrative + pitch structure + judge Q&A prep. |
