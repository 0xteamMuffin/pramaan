# Compliance & Scoring Engine

The deterministic heart of PRAMAAN. It takes normalized bidder data + portal results + AI findings, applies **tender rules + statutory checks**, and produces per-check verdicts, an **explainable score**, and a **risk band** — with **hard vetoes** that override the arithmetic.

> Design intent: the score is never a black box. Every point is attributable to a check, and every check to evidence.

---

## 1. Check taxonomy

Each check is a small, testable unit implementing a common interface:

```python
class Check(Protocol):
    key: str                     # "gst", "pan", "udyam", "mii", "debarment", ...
    dimension: str               # which scoring dimension it feeds
    def applies(self, tender, bidder) -> bool: ...      # tender-conditional
    def evaluate(self, ctx) -> CheckResult: ...         # PASS/FAIL/WARN/NA/UNVERIFIABLE (+evidence)
```

**Verdict states (5):**
| Verdict | Meaning | Score effect |
|---|---|---|
| `PASS` | Requirement satisfied, verified | full credit |
| `WARN` | Minor issue / stale / low-confidence | partial credit + flag |
| `FAIL` | Requirement not met / contradicted | zero credit (+ veto if critical) |
| `NOT_APPLICABLE` | Not required for this tender/bidder | excluded from denominator |
| `UNVERIFIABLE` | Source unavailable / data missing | excluded but flagged "needs manual" |

> **Fairness rule:** `UNVERIFIABLE ≠ FAIL`. We never penalize a bidder because a government portal was down; we surface it for manual review.

---

## 2. Scoring dimensions & default weights

Illustrative starting weights (all **configurable per tender**; re-validate against policy):

| Dimension | Weight | Example checks |
|---|---|---|
| **Identity & legal existence** | 25% | PAN validity+category, MCA CIN/DIN active, name reconciliation |
| **Tax & financial** | 20% | GST active + return filing regularity, turnover threshold |
| **Eligibility-claim authenticity** | 20% | Udyam class sanity, MII Class-I/II, OEM/MAF, BIS, Startup/NSIC |
| **Integrity & exclusion** | 15% (+veto) | Debarment/blacklist, litigation, cartel/related-party signals |
| **Statutory / labour** | 10% | EPFO/ESIC (when applicable) |
| **Document integrity** | 10% | Forgery/tamper findings, DigiLocker-signed vs uploaded |

**Score computation (per dimension, then weighted):**
```
dimension_score = Σ(check_credit × check_weight) / Σ(applicable check_weight)   // 0..1
overall_raw     = Σ(dimension_score × dimension_weight)                          // 0..1
overall_score   = round(overall_raw × 100)                                       // 0..100
```
`check_credit`: PASS=1.0, WARN=0.5 (configurable), FAIL=0, UNVERIFIABLE/NA excluded.

---

## 3. Hard vetoes (knock-outs)

Some findings force **High risk** regardless of arithmetic (but still **never auto-disqualify** — they cap the score and flag prominently):

| Veto | Trigger |
|---|---|
| **Confirmed debarment** | Bidder / director / PAN matches a debarment record |
| **Forged document** | Forensics verdict = tampered with high confidence |
| **Cancelled GST / struck-off company** | Portal status inactive |
| **PAN mismatch** | Extracted/declared PAN ≠ portal PAN (identity fraud) |
| **Fake OEM/MAF** | OEM authorization unverifiable/contradicted for quoted brand |

Veto effect: `band = HIGH`, `score = min(score, 39)`, reason surfaced at top of verdict, `is_veto=true` on the check.

---

## 4. Risk bands (RAG)

| Band | Score | Meaning (advisory) |
|---|---|---|
| 🟢 **LOW** | 70–100 | Compliant; no vetoes; minor/none WARNs |
| 🟡 **MEDIUM** | 40–69 | Gaps/WARNs or unverifiable criticals → scrutiny |
| 🔴 **HIGH** | 0–39 | FAILs or any veto → strong scrutiny/likely disqualify |

Band also considers **count of vetoes** and **unverifiable-critical count**, not score alone.

---

## 5. Tender rule engine (rules as data)

Rules come from a **tender template** + per-tender overrides, stored as `tender_requirement.params` (jsonb):

```jsonc
// Example tender rule set (services tender, MSE-preference enabled)
{
  "turnover":   { "mandatory": true,  "min_turnover": 50000000, "years": 3 },
  "gst":        { "mandatory": true,  "require_returns": 12 },
  "pan":        { "mandatory": true },
  "epfo":       { "mandatory": true },            // services → labour applicable
  "esic":       { "mandatory": true },
  "mse_pref":   { "enabled": true,  "margin_pct": 15 },
  "mii":        { "mandatory": true, "min_class": "II", "value_cap_cr": 200 },
  "oem":        { "mandatory": false },
  "bis":        { "mandatory": false },
  "debarment":  { "mandatory": true }
}
```

The engine:
1. Determines **applicable** checks (`applies()` + `mandatory`).
2. Runs each check with its params.
3. Applies **preferences** (MSE L1+15%, MII 20% margin) as *annotations* for the officer (they affect award, not the compliance verdict).

---

## 6. Explainability output (per bidder)

```jsonc
{
  "score": 62, "band": "MEDIUM",
  "dimensions": [
    { "name": "Identity & legal existence", "weight": 0.25, "score": 0.90,
      "checks": [ { "key": "pan", "verdict": "PASS", "credit": 1.0 },
                  { "key": "mca", "verdict": "PASS", "credit": 1.0 },
                  { "key": "name_reconcile", "verdict": "WARN", "credit": 0.5,
                    "why": "Trade name on Udyam differs from PAN name" } ] },
    { "name": "Integrity & exclusion", "weight": 0.15, "score": 0.0,
      "vetoes": [ { "key": "debarment", "why": "Director DIN matches CPPP debarred list (captured 2026-08-01)" } ] }
    // ...
  ],
  "reasons_top": [
    "VETO: director matches debarment snapshot",
    "WARN: Udyam name mismatch",
    "UNVERIFIABLE: ESIC portal (mock) returned no record"
  ]
}
```

Every `why` links to an `evidence` row with source/method/timestamp.

---

## 7. Testing & determinism
- Each `Check` is unit-tested against fixture inputs (PASS/FAIL/WARN/edge).
- With **mock providers**, an entire bidder's score is **deterministic** → reproducible demos and regression tests.
- Weight/threshold changes are config → covered by golden-file tests on the synthetic dataset.

## 8. Where AI fits vs rules
- **Rules/engine = deterministic** (thresholds, format validation, status checks, arithmetic, vetoes).
- **AI assists** with: extraction (OCR), fuzzy name/address reconciliation, forgery findings, cartel/graph inference, and the **natural-language recommendation** — but AI outputs enter the score **only as structured check results with evidence**, never as an opaque number. See [ai-verification-engine.md](ai-verification-engine.md).
