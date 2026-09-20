"""The verification engine — the public entrypoint the API calls.

`run_verification(db, bid_id)` runs the full pipeline for one bid:
  1. load bid/bidder/tender/requirements/documents; create the run
  2. per-document extraction (OCR) + forensic analysis
  3. normalize identifiers
  4. call government providers for applicable portal checks (persist ProviderCall)
  5. cross-check reconciliation + entity graph + forensics into ctx.ai
  6. evaluate every applicable check -> CheckResult(+Evidence)  [robust, per-check try/except]
  7. score  -> ComplianceScore
  8. recommend -> Recommendation (advisory only)
  9. finalize run status/timestamps + audit trail

Determinism: with empty keys, seeded data yields the golden outcomes. Robustness:
a single failing check degrades to UNVERIFIABLE and never aborts the run.
"""
from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import crosscheck as crosscheck_mod
from app.ai import extraction as extraction_mod
from app.ai import forgery as forgery_mod
from app.ai import graph as graph_mod
from app.ai import recommend as recommend_mod
from app.compliance import checks as _checks  # noqa: F401  (fills CHECK_REGISTRY)
from app.compliance import scoring
from app.compliance.base import CHECK_REGISTRY, CheckContext, CheckOutput
from app.models import (
    Bid,
    CheckResult,
    ComplianceScore,
    Evidence,
    ProviderCall,
    Recommendation,
    VerificationRun,
)
from app.models.enums import Dimension, RunStatus, Verdict
from app.providers.base import VerifyRequest, VerifyResult
from app.providers.registry import get_gov_provider
from app.services import audit

# Identity/integrity checks that always run regardless of tender rules — the
# universal fraud gates (identity, corporate existence, debarment, cartel, forgery).
ALWAYS_ON: set[str] = {"pan", "name_reconcile", "mca", "debarment", "cartel", "doc_integrity"}

# Checks that are backed by a government provider (get_gov_provider().verify()).
PORTAL_CHECKS: set[str] = {
    "pan", "gst", "udyam", "mca", "epfo", "esic", "nsic", "bis", "startup", "oem", "digilocker",
}

MANUAL_SECONDS_ESTIMATE = 10800  # ~3 hours of manual verification effort saved


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _mask(value: str | None) -> str | None:
    if not value or len(value) < 6:
        return value
    return value[:3] + "X" * (len(value) - 5) + value[-2:]


def _bidder_snapshot(bidder: Any) -> dict[str, Any]:
    return {
        "legal_name": getattr(bidder, "legal_name", None),
        "trade_name": getattr(bidder, "trade_name", None),
        "constitution": getattr(bidder, "constitution", None),
        "primary_pan": getattr(bidder, "primary_pan", None),
    }


def _collect_identifiers(bidder: Any) -> tuple[dict[str, str], list[str]]:
    identifiers: dict[str, str] = {}
    dins: list[str] = []
    for ident in getattr(bidder, "identifiers", None) or []:
        kind = str(getattr(ident, "kind", "")).lower()
        val = getattr(ident, "value", None)
        if not val:
            continue
        if kind == "din":
            dins.append(str(val).strip().upper())
        else:
            identifiers[kind] = str(val).strip().upper()
    if getattr(bidder, "primary_pan", None) and "pan" not in identifiers:
        identifiers["pan"] = str(bidder.primary_pan).strip().upper()
    return identifiers, dins


def _verifyresult_to_dict(res: VerifyResult) -> dict[str, Any]:
    return {
        "ok": res.ok,
        "data": dict(res.data or {}),
        "source": res.source,
        "method": res.method,
        "mode": res.mode,
        "confidence": res.confidence,
        "observed_at": res.observed_at.isoformat() if res.observed_at else None,
        "error": res.error,
    }


def _applicable_keys(requirement_keys: set[str], bidder: Any, documents: list[Any]) -> set[str]:
    """Applicable = tender requirements ∪ always-on identity/integrity checks.

    (Rules-as-data: everything beyond identity/integrity is tender-driven.) OEM and
    DigiLocker are additionally activated by the presence of a MAF / DigiLocker
    document so tampered/expired authorizations are still caught even when the
    tender did not explicitly list them.
    """
    keys = set(requirement_keys) | set(ALWAYS_ON)
    flags = dict(getattr(bidder, "claimed_flags", None) or {})
    if flags.get("oem") or flags.get("quoted_brand") or flags.get("brand"):
        keys.add("oem")
    for doc in documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if "maf" in dt or "oem" in dt or "authoriz" in dt or "authoris" in dt:
            keys.add("oem")
        if str(getattr(doc, "source", "")).lower() == "digilocker":
            keys.add("digilocker")
    return keys


# --------------------------------------------------------------------------- #
# Public entrypoints
# --------------------------------------------------------------------------- #
def run_verification(db: Session, bid_id: str, *, mode: str = "SIMULATED") -> VerificationRun:
    bid = db.get(Bid, bid_id)
    if bid is None:
        raise ValueError(f"Bid not found: {bid_id}")
    bidder = bid.bidder
    tender = bid.tender
    requirements = list(getattr(tender, "requirements", None) or [])
    documents = list(getattr(bidder, "documents", None) or [])

    run = VerificationRun(
        bid_id=bid_id, status=RunStatus.RUNNING.value, provider_mode=mode, started_at=_now()
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    audit.record(
        db, action="run.started", target=f"run:{run.id}",
        payload={"bid_id": bid_id, "bidder": getattr(bidder, "legal_name", None), "mode": mode},
    )

    # ---- 2) per-document extraction + forensics ----
    forgery_map: dict[str, dict[str, Any]] = {}
    for doc in documents:
        try:
            extraction_mod.extract_document(db, doc)
        except Exception as exc:  # noqa: BLE001
            audit.record(db, action="extraction.error", target=f"doc:{getattr(doc,'id',None)}",
                         payload={"error": str(exc)}, commit=False)
        try:
            result = forgery_mod.analyze_document(doc)
            doc.forensics = result
            db.add(doc)
            forgery_map[getattr(doc, "id", None)] = result
        except Exception as exc:  # noqa: BLE001
            audit.record(db, action="forensics.error", target=f"doc:{getattr(doc,'id',None)}",
                         payload={"error": str(exc)}, commit=False)
    db.commit()

    # ---- 3) identifiers ----
    identifiers, dins = _collect_identifiers(bidder)

    req_by_key = {r.check_key: r for r in requirements}
    applicable = _applicable_keys(set(req_by_key), bidder, documents)

    ctx = CheckContext(
        tender=tender, bidder=bidder, bid=bid,
        identifiers=identifiers, documents=documents,
        portal={}, ai={"forgery": forgery_map},
        extras={"db": db, "dins": dins, "forgery": forgery_map},
    )

    # ---- 4) government portal calls ----
    for key in sorted(applicable & PORTAL_CHECKS):
        req = req_by_key.get(key)
        vreq = VerifyRequest(
            check_key=key,
            identifiers=identifiers,
            bidder=_bidder_snapshot(bidder),
            params=dict(getattr(req, "params", None) or {}),
            context={"tender_id": getattr(tender, "id", None)},
        )
        try:
            res = get_gov_provider(key).verify(vreq)
        except Exception as exc:  # noqa: BLE001
            res = VerifyResult(ok=False, data={}, source=f"{key} (error)", method="error",
                               mode=mode, confidence=0.0, error=str(exc))
        ctx.portal[key] = _verifyresult_to_dict(res)

        db.add(
            ProviderCall(
                provider=res.source or key,
                mode=res.mode or mode,
                request_meta={
                    "check_key": key,
                    "identifiers": {k: _mask(v) for k, v in identifiers.items()},
                },
                response_meta={
                    "ok": res.ok,
                    "source": res.source,
                    "method": res.method,
                    "mode": res.mode,
                    "confidence": res.confidence,
                    "status": (res.data or {}).get("status"),
                    "data_keys": sorted((res.data or {}).keys()),
                    "error": res.error,
                },
            )
        )
    db.commit()

    # ---- 5) cross-check + graph + forensics into ctx.ai ----
    try:
        crosscheck_mod.crosscheck(ctx)  # populates ctx.ai["crosscheck"]
    except Exception as exc:  # noqa: BLE001
        ctx.ai["crosscheck"] = {}
        audit.record(db, action="crosscheck.error", target=f"run:{run.id}",
                     payload={"error": str(exc)}, commit=False)
    try:
        ctx.ai["graph"] = graph_mod.build_graph(db, getattr(tender, "id"))
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        ctx.ai["graph"] = {"nodes": [], "edges": [], "clusters": [], "shell": {}}
        audit.record(db, action="graph.error", target=f"run:{run.id}",
                     payload={"error": str(exc)}, commit=False)

    # ---- 6) evaluate checks ----
    check_outputs: list[CheckOutput] = []
    for key, check in CHECK_REGISTRY.items():
        if key not in applicable:
            continue
        req = req_by_key.get(key)
        cctx = replace(ctx, requirement=req, params=dict(getattr(req, "params", None) or {}))
        try:
            if not check.applies(cctx):
                out = CheckOutput(
                    check_key=key, dimension=check.dimension,
                    verdict=Verdict.NOT_APPLICABLE.value, summary="Not applicable to this tender/bidder",
                )
            else:
                out = check.evaluate(cctx)
        except Exception as exc:  # noqa: BLE001 - robustness: never abort the run
            out = CheckOutput(
                check_key=key, dimension=getattr(check, "dimension", Dimension.ELIGIBILITY.value),
                verdict=Verdict.UNVERIFIABLE.value, summary=f"Check error (needs manual review): {exc}",
                confidence=0.0,
            )
        check_outputs.append(out)
        _persist_check(db, run.id, out)
        audit.record(
            db, action="check.completed", target=f"run:{run.id}:{key}",
            payload={"verdict": out.verdict, "is_veto": out.is_veto, "summary": out.summary[:200]},
            commit=False,
        )
    db.commit()

    # ---- 7) scoring ----
    score_result = scoring.score_run(check_outputs, requirements)
    db.add(
        ComplianceScore(
            run_id=run.id,
            score=score_result["score"],
            band=score_result["band"],
            dimension_scores=score_result["dimension_scores"],
            vetoes=score_result["vetoes"],
        )
    )
    db.commit()

    # ---- 8) recommendation (advisory) ----
    try:
        rec = recommend_mod.recommend(ctx, check_outputs, score_result)
    except Exception as exc:  # noqa: BLE001
        rec = {
            "stance": "FURTHER_SCRUTINY",
            "rationale": f"Recommendation unavailable ({exc}); manual review advised.",
            "evidence_refs": [],
            "model_meta": {"provider": "none", "error": str(exc)},
        }
    db.add(
        Recommendation(
            run_id=run.id,
            stance=rec["stance"],
            rationale=rec["rationale"],
            evidence_refs=rec.get("evidence_refs", []),
            model_meta=rec.get("model_meta", {}),
        )
    )
    db.commit()

    # ---- 9) finalize ----
    run.status = RunStatus.COMPLETE.value
    run.finished_at = _now()
    run.manual_seconds_estimate = MANUAL_SECONDS_ESTIMATE
    db.add(run)
    db.commit()
    audit.record(
        db, action="run.completed", target=f"run:{run.id}",
        payload={
            "score": score_result["score"],
            "band": score_result["band"],
            "vetoes": [v.get("key") for v in score_result["vetoes"]],
            "stance": rec["stance"],
        },
    )
    db.refresh(run)
    return run


def _persist_check(db: Session, run_id: str, out: CheckOutput) -> CheckResult:
    cr = CheckResult(
        run_id=run_id,
        check_key=out.check_key,
        dimension=out.dimension,
        verdict=out.verdict,
        confidence=out.confidence,
        summary=out.summary,
        data=out.data,
        is_veto=out.is_veto,
        source=out.source,
        method=out.method,
        mode=out.mode,
        observed_at=_now(),
    )
    db.add(cr)
    db.flush()
    for ev in out.evidence or []:
        db.add(
            Evidence(
                check_result_id=cr.id,
                kind=ev.kind,
                label=ev.label,
                source=ev.source,
                method=ev.method,
                payload=_json_safe(ev.payload),
                document_id=ev.document_id,
            )
        )
    return cr


def _json_safe(value: Any) -> Any:
    """Best-effort conversion so JSON columns never choke on datetimes/sets."""
    import json

    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return json.loads(json.dumps(value, default=str))


def build_tender_graph(db: Session, tender_id: str) -> dict[str, Any]:
    """Build + persist the tender entity graph and return nodes/edges/clusters."""
    result = graph_mod.build_graph(db, tender_id)
    db.commit()
    return result
