# Security, Privacy & Audit

Government procurement tooling must be **trustworthy, tamper-evident, and privacy-respecting**. This doc covers access control, PII handling (DPDP-aligned), the hash-chained audit trail, and data-source integrity.

---

## 1. Access control (RBAC)

| Role | Can |
|---|---|
| **Procurement Officer** | View tenders/bidders/verdicts, run verification, **record the final decision**, export reports |
| **Verification Analyst** | Upload docs, run/re-run checks, annotate, resolve "unverifiable" — **cannot** record final decision |
| **Audit / Vigilance** | Read-only everything incl. full audit chain + integrity verify; export |
| **Admin** | Manage users/roles, provider config, tender templates, live↔mock toggles |

- **JWT** access/refresh; short-lived access tokens; role claims enforced per endpoint.
- **Least privilege:** the "officer-in-control" guarantee is also an authZ rule — only Officer can `POST /bids/{id}/decision`.
- **Separation of duties:** AI recommendation (system) and human decision (officer) are distinct records and distinct permissions.

---

## 2. PII & data protection (DPDP 2023-aligned)

Even though the demo uses **synthetic data**, the design follows the Digital Personal Data Protection Act principles so it's production-credible:

- **Data minimization:** store only fields needed for a check; drop raw OCR text after fields are extracted (keep hash + evidence snippet).
- **Masking:** PAN/GSTIN/Aadhaar masked in UI by default (`ABCDE1234F` → `ABCXX1234X`) with reveal-on-permission + audit log of reveals.
- **Purpose limitation:** verification data used only for the tender it was collected for.
- **Consent for DigiLocker:** issuer-signed pulls follow DigiLocker's consent flow (documented; mocked in demo).
- **Retention:** configurable retention window; auto-purge documents post-award + retention period; audit metadata retained longer (traceability) but PII-masked.
- **Encryption:** TLS in transit; at-rest encryption for object storage + DB (prod); secrets in a secrets manager (env in dev, never committed).
- **No training on real PII:** note that some free LLM tiers (Gemini free) may use inputs for training → for real deployment use paid/no-train tiers or local Ollama for any real PII. Documented explicitly.

---

## 3. Hash-chained audit trail (tamper-evident)

Every meaningful action appends an immutable event:

```
event.hash = sha256( prev_hash + canonical_json(actor, action, target, payload, created_at) )
```

- **Append-only** (`audit_event`), monotonic `seq`, each row stores `prev_hash` + `hash`.
- **Integrity verify** (`GET /audit/verify`) recomputes the chain; any altered/removed row breaks it → visibly flagged.
- **What's logged:** run start/complete, each check result, provider call (mode/source), score computed, recommendation generated, document uploaded/revealed, and the **officer decision** with reasoning.
- **PII-masked payloads** in the log (store references + masked values, not raw docs).
- **Prod hardening (documented):** WORM/append-only storage, periodic anchoring of the chain head (e.g., signed timestamp) for external verifiability.

This delivers the PS's requirement #14 ("auditable record") and the impact goal "complete auditability & traceability," to a GFR/CVC-credible standard.

---

## 4. Data-source integrity & honesty

- Every data point carries **provenance** (source, method, timestamp) and a **mode badge** (`LIVE`/`SIMULATED`/`SNAPSHOT`).
- **Snapshots** (debarment) show capture date; staleness is visible, never hidden.
- **UNVERIFIABLE ≠ FAIL:** the system refuses to fabricate a result when a source is unavailable.
- **No claim of access we don't have:** the deck + UI are explicit about GSP/authorized-entity gating and DigiLocker org onboarding.

---

## 5. Application security hygiene
- Input validation via Pydantic; file-type/size limits + AV scan hook on uploads.
- SSRF/scrape safety: snapshot loaders run offline against saved datasets, not live scraping in the request path.
- AuthN rate-limiting; audit of failed logins.
- Dependency pinning + `pip-audit`/`npm audit` (CI, later).
- Prompt-injection defense for the LLM: evidence is passed as data, recommendation output is schema-validated and every claim must reference an existing evidence id (no free-form fact injection into decisions).

---

## 6. Ethical & fairness safeguards
- **Advisory only:** no auto-disqualification; the officer decides and is accountable.
- **Explainability:** every adverse signal is shown with its evidence so a bidder can be fairly reviewed / given a chance to clarify.
- **Bias caution:** scoring uses objective statutory facts, not proxies; weights are transparent and configurable by policy.
- **Right to correction:** unverifiable/mismatch items route to manual review rather than silent rejection.
