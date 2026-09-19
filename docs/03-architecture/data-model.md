# Data Model

Evidence-first, audit-first schema. Every verdict traces to evidence; every mutation traces to an audit event. IDs are UUIDs unless noted. Timestamps are UTC.

---

## Entity overview

```
Organization 1───* User
Tender 1───* TenderRequirement
Tender 1───* Bid ──── * ─────1 Bidder
Bidder 1───* Document
Bidder 1───* Identifier            (PAN, GSTIN, Udyam, CIN, DIN, EPFO, ESIC…)
Bid   1───1 VerificationRun 1───* CheckResult 1───* Evidence
VerificationRun 1───1 ComplianceScore
VerificationRun 1───1 Recommendation
EntityNode *───* EntityEdge        (entity-resolution graph)
DebarmentRecord (snapshot dataset)
AuditEvent (hash-chained, append-only)
Provider / ProviderCall            (which adapter served each check)
```

---

## Core tables

### `tender`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| ref_no | text | GeM bid no. |
| title | text | |
| buyer_org | text | e.g., CPCL |
| category | text | goods/services/works |
| estimated_value | numeric | ₹ |
| template_id | uuid | rule template used |
| status | enum | draft/open/evaluating/awarded/closed |
| created_by | uuid → user | |
| created_at | ts | |

### `tender_requirement` (rules as data)
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| tender_id | uuid → tender | |
| check_key | text | e.g., `gst`, `turnover`, `mii`, `oem` |
| mandatory | bool | |
| params | jsonb | e.g., `{ "min_turnover": 50000000, "years": 3 }` |
| weight_override | numeric? | optional per-tender weight |

### `bidder`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| legal_name | text | |
| trade_name | text | |
| constitution | enum | proprietorship/partnership/LLP/pvt/public/… |
| claimed_flags | jsonb | self-declared: MSE class, startup, MII class, OEM |
| primary_pan | text | universal join key |
| contact | jsonb | email, phone, address (for graph) |

### `identifier`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| bidder_id | uuid → bidder | |
| kind | enum | PAN/GSTIN/UDYAM/CIN/DIN/EPFO/ESIC/DPIIT/NSIC/BIS |
| value | text | |
| format_valid | bool | regex validation result |
| source | enum | extracted/portal/declared |

### `bid`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| tender_id | uuid → tender | |
| bidder_id | uuid → bidder | |
| quoted_value | numeric | for L1/RA + cartel signals |
| submitted_at | ts | |
| submission_meta | jsonb | ip, session, device (cartel signals) |

### `document`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| bidder_id | uuid → bidder | |
| doc_type | enum | udyam_cert/gst_cert/pan_card/maf/bis_cert/… |
| storage_uri | text | object store |
| file_hash | text | sha256 (dedupe + tamper baseline) |
| source | enum | uploaded/digilocker |
| extracted | jsonb | OCR fields + confidences |
| forensics | jsonb | metadata, ELA/copy-move findings, verdict |

### `verification_run`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| bid_id | uuid → bid | |
| status | enum | queued/running/complete/failed |
| started_at / finished_at | ts | (for time-savings metric) |
| provider_mode | enum | live/mock/mixed |

### `check_result`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| run_id | uuid → verification_run | |
| check_key | text | `gst`, `pan`, `udyam`, `debarment`, … |
| verdict | enum | **PASS / FAIL / WARN / NOT_APPLICABLE / UNVERIFIABLE** |
| confidence | numeric | 0–1 |
| summary | text | human-readable |
| data | jsonb | normalized portal/extracted payload |
| is_veto | bool | hard knock-out triggered |
| provider_call_id | uuid → provider_call | provenance |
| checked_at | ts | |

### `evidence`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| check_result_id | uuid → check_result | |
| kind | enum | portal_response/document_field/forensic/graph/rule |
| label | text | e.g., "GSTIN status: Active" |
| source | text | GSTN/MCA/Udyam/World Bank/... |
| method | text | api-live/mock/ocr/regex/ELA/... |
| observed_at | ts | provenance timestamp |
| payload | jsonb | raw supporting data / snippet |
| document_id | uuid? → document | if from a doc |

### `compliance_score`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| run_id | uuid → verification_run | |
| score | numeric | 0–100 |
| band | enum | LOW/MEDIUM/HIGH risk (Green/Amber/Red) |
| dimension_scores | jsonb | per-dimension breakdown + weights |
| vetoes | jsonb | list of triggered knock-outs |
| computed_at | ts | |

### `recommendation`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| run_id | uuid → verification_run | |
| stance | enum | RECOMMEND_QUALIFY / FURTHER_SCRUTINY / RECOMMEND_DISQUALIFY (advisory only) |
| rationale | text | LLM-generated, grounded |
| evidence_refs | jsonb | ids of supporting check_results/evidence |
| model_meta | jsonb | provider/model used |

### Officer decision (kept separate from AI)
### `decision`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| bid_id | uuid → bid | |
| officer_id | uuid → user | |
| outcome | enum | QUALIFIED / DISQUALIFIED / ON_HOLD |
| note | text | officer's reasoning |
| decided_at | ts | |
> The AI recommendation and the human decision are **distinct records** — this is the "officer-in-control" guarantee, enforced in the schema.

---

## Entity-resolution graph

### `entity_node`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| type | enum | bidder/pan/gstin/cin/din/address/email/phone/bank/ip |
| value | text | normalized |

### `entity_edge`
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| src_id / dst_id | uuid → entity_node | |
| relation | text | has_pan/shares_address/same_director/... |
| weight | numeric | strength/confidence |
| run_ids | jsonb | which runs contributed |

Fraud detectors query this graph: shared director/PAN/address/bank/IP across bidders in a tender ⇒ **related-party / cartel** signal.

---

## Audit & providers

### `audit_event` (append-only, hash-chained)
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| seq | bigserial | monotonic order |
| actor_id | uuid? | user or `system` |
| action | text | e.g., `run.started`, `check.completed`, `decision.recorded` |
| target | text | entity ref |
| payload | jsonb | minimal, PII-masked |
| prev_hash | text | sha256 of previous event |
| hash | text | sha256(prev_hash + canonical(payload)) |
| created_at | ts | |

### `provider_call` (provenance of every external/mock call)
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| provider | text | sandbox_gst/mock_epfo/worldbank_snapshot/gemini_ocr… |
| mode | enum | live/mock/snapshot |
| request_meta | jsonb | endpoint + masked params |
| response_meta | jsonb | status, latency |
| called_at | ts | |

### `debarment_record` (snapshot dataset)
| col | type | notes |
|---|---|---|
| id | uuid | PK |
| source | enum | worldbank/cppp/ministry |
| entity_name | text | |
| pan / cin / din | text? | for fuzzy join |
| grounds | text | |
| from_date / to_date | date | debarment period |
| captured_at | ts | snapshot date (shown in UI) |

---

## Notes
- **`verdict` is 5-state** (not binary): distinguishing `UNVERIFIABLE` (portal down) from `FAIL` (actual non-compliance) is a fairness requirement.
- **jsonb everywhere flexible** (params/data/evidence) to avoid schema churn during a hackathon while keeping core relations strict.
- **`file_hash`** enables dedupe, tamper baselines, and OCR result caching across re-runs.
- **All PII** in demo is synthetic; masking rules in [security-and-audit.md](security-and-audit.md).
