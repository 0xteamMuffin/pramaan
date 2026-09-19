# API Design (REST)

FastAPI, JSON, OpenAPI-documented (`/docs`). Auth via JWT bearer; RBAC per role. All list endpoints paginated. All mutations write an audit event.

Base path: `/api/v1`

---

## Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | email/password → access + refresh JWT |
| POST | `/auth/refresh` | refresh access token |
| GET | `/auth/me` | current user + role |

## Tenders
| Method | Path | Purpose |
|---|---|---|
| GET | `/tenders` | list (filters: status, buyer) |
| POST | `/tenders` | create (from template) |
| GET | `/tenders/{id}` | detail + requirements |
| PATCH | `/tenders/{id}` | update rules/status |
| GET | `/tenders/{id}/bids` | bids in this tender |
| GET | `/tenders/{id}/comparison` | side-by-side compliance matrix of all bidders |
| GET | `/tenders/{id}/graph` | entity-resolution graph for the tender (cartel view) |
| POST | `/tenders/{id}/evaluate` | run verification for all bids (bulk) |

## Templates (rules as data)
| Method | Path | Purpose |
|---|---|---|
| GET | `/templates` | list rule templates |
| POST | `/templates` | create/edit template (`check_key` → params, weights) |

## Bidders & documents
| Method | Path | Purpose |
|---|---|---|
| GET | `/bidders/{id}` | profile + identifiers |
| POST | `/bidders` | create bidder |
| POST | `/bidders/{id}/documents` | upload doc(s) (multipart) → triggers extraction |
| POST | `/bidders/{id}/digilocker/pull` | pull issuer-signed docs (live/mock) |
| GET | `/documents/{id}` | doc + extracted fields + forensics |

## Verification
| Method | Path | Purpose |
|---|---|---|
| POST | `/bids/{id}/verify` | run full verification for a bid (async) |
| GET | `/runs/{id}` | run status + all check results |
| GET | `/runs/{id}/checks/{key}` | single check detail + evidence |
| GET | `/runs/{id}/score` | compliance score + dimensions + vetoes |
| GET | `/runs/{id}/recommendation` | AI recommendation (advisory) |
| POST | `/runs/{id}/recheck/{key}` | re-run a single check (e.g., after portal back up) |

## Decision (officer-in-control)
| Method | Path | Purpose |
|---|---|---|
| POST | `/bids/{id}/decision` | officer records QUALIFIED/DISQUALIFIED/ON_HOLD + note |
| GET | `/bids/{id}/decision` | decision history |

## Debarment
| Method | Path | Purpose |
|---|---|---|
| GET | `/debarment/search?q=&pan=&cin=&din=` | fuzzy search snapshot dataset |

## Providers (config + toggle)
| Method | Path | Purpose |
|---|---|---|
| GET | `/providers` | current chains + modes + health |
| PATCH | `/providers/{check_key}` | set mode (live/mock/snapshot) — demo toggle |
| POST | `/providers/offline` | flip global offline mode |

## Audit & reports
| Method | Path | Purpose |
|---|---|---|
| GET | `/audit?target=&actor=&from=&to=` | hash-chained audit events |
| GET | `/audit/verify` | verify chain integrity |
| GET | `/bids/{id}/report.pdf` | generate/download audit report (PDF) |

## Analytics
| Method | Path | Purpose |
|---|---|---|
| GET | `/metrics/time-savings` | manual vs PRAMAAN time comparison (impact) |
| GET | `/metrics/summary` | counts by band/verdict for a tender |

---

## Representative payloads

**POST `/bids/{id}/verify`** → `202 Accepted`
```json
{ "run_id": "…", "status": "queued" }
```

**GET `/runs/{id}`**
```jsonc
{
  "run_id": "…", "status": "complete",
  "started_at": "…", "finished_at": "…",
  "checks": [
    { "key": "gst", "verdict": "PASS", "confidence": 0.98,
      "summary": "GSTIN active; 12/12 recent returns filed",
      "source": "GSTN (sandbox)", "method": "api-live", "observed_at": "…", "is_veto": false },
    { "key": "debarment", "verdict": "FAIL", "is_veto": true,
      "summary": "Director DIN matches CPPP debarred list",
      "source": "CPPP snapshot", "method": "snapshot", "observed_at": "…" }
  ]
}
```

**GET `/runs/{id}/score`**
```jsonc
{ "score": 34, "band": "HIGH",
  "dimensions": [ { "name": "Integrity & exclusion", "weight": 0.15, "score": 0.0,
                    "vetoes": [ { "key": "debarment", "why": "…", "evidence": ["ev_…"] } ] } ],
  "reasons_top": [ "VETO: debarment match", "WARN: Udyam name mismatch" ] }
```

## Conventions
- **Errors:** RFC-7807-style `{ "type","title","status","detail" }`.
- **Idempotency:** `verify` returns existing run if one is in-flight for the bid.
- **Provenance:** every data-bearing response includes `source`/`method`/`observed_at`.
- **Pagination:** `?page=&size=`; responses include `total`.
- **Versioned** under `/api/v1` for forward-compat.
