"""Serializers: ORM -> the exact JSON shapes the frontend expects (frontend/lib/types.ts).

Also provides `ensure_run()` which lazily runs verification for a bid if it has no
completed run yet, so read endpoints always have data to show.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Bid,
    Bidder,
    ComplianceScore,
    Decision,
    Document,
    Tender,
    VerificationRun,
)

ORG = "Chennai Petroleum Corporation Limited (CPCL)"

DIMENSION_NAMES = {
    "identity_legal_existence": "Identity & legal existence",
    "tax_financial": "Tax & financial",
    "eligibility_claim_authenticity": "Eligibility-claim authenticity",
    "integrity_exclusion": "Integrity & exclusion",
    "statutory_labour": "Statutory / labour",
    "document_integrity": "Document integrity",
}

_FORENSIC_VERDICT = {"clean": "PASS", "suspect": "WARN", "tampered": "FAIL", "unknown": "UNVERIFIABLE"}

_ACRONYMS = {"oem", "maf", "gst", "pan", "bis", "isi", "crs", "epfo", "esic",
             "dpiit", "nsic", "mca", "msme", "id", "din", "cin", "gstin"}


def _pretty_doc_type(doc_type: str) -> str:
    words = (doc_type or "").replace("_", " ").split()
    return " ".join(w.upper() if w.lower() in _ACRONYMS else w.capitalize() for w in words)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# --------------------------------------------------------------------------- #
# Runs
# --------------------------------------------------------------------------- #
def latest_run(db: Session, bid_id: str) -> VerificationRun | None:
    return db.execute(
        select(VerificationRun)
        .where(VerificationRun.bid_id == bid_id, VerificationRun.status == "complete")
        .order_by(VerificationRun.started_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def ensure_run(db: Session, bid_id: str) -> VerificationRun | None:
    run = latest_run(db, bid_id)
    if run is not None:
        return run
    from app.compliance import engine  # lazy (avoids import cycle)

    return engine.run_verification(db, bid_id)


# --------------------------------------------------------------------------- #
# Users / auth
# --------------------------------------------------------------------------- #
def user_to_dict(user: Any) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "org": ORG}


# --------------------------------------------------------------------------- #
# Tenders
# --------------------------------------------------------------------------- #
def _rule_summary(tender: Tender) -> list[str]:
    out: list[str] = []
    for r in tender.requirements:
        p = r.params or {}
        if r.check_key == "turnover" and p.get("min_turnover"):
            out.append(f"Turnover ≥ ₹{int(p['min_turnover']):,} over {p.get('years', 3)}y")
        elif r.check_key == "mii" and p.get("min_class"):
            out.append(f"Make-in-India Class-{p['min_class']} (≥{p.get('min_local_content_pct','?')}% LC)")
        elif r.check_key == "oem":
            out.append("OEM authorization (MAF) for quoted brand")
        elif r.check_key == "bis" and p.get("scheme"):
            out.append(f"BIS {p['scheme']} for {p.get('product', 'product')}")
        elif r.check_key in ("epfo", "esic") and r.mandatory:
            out.append(f"{r.check_key.upper()} statutory registration")
        elif r.check_key == "gst" and p.get("require_returns"):
            out.append(f"GST active + {p['require_returns']} recent returns")
        elif r.check_key == "udyam" and p.get("mse_preference"):
            out.append(f"MSE purchase preference (+{p.get('margin_pct', 15)}%)")
    return out


def tender_to_dict(db: Session, tender: Tender, *, detail: bool = False) -> dict:
    bids = list(tender.bids)
    high = 0
    for b in bids:
        run = latest_run(db, b.id)
        if run and run.score and run.score.band == "HIGH":
            high += 1
    out = {
        "id": tender.id, "ref_no": tender.ref_no, "title": tender.title,
        "buyer_org": tender.buyer_org, "category": tender.category,
        "estimated_value": float(tender.estimated_value or 0), "status": tender.status,
        "created_at": _iso(tender.created_at), "bidder_count": len(bids),
        "high_risk_count": high,
    }
    if detail:
        out["requirements"] = [
            {"check_key": r.check_key, "mandatory": r.mandatory, "params": r.params or {},
             "weight_override": r.weight_override}
            for r in tender.requirements
        ]
        out["rule_summary"] = _rule_summary(tender)
    return out


# --------------------------------------------------------------------------- #
# Bidders
# --------------------------------------------------------------------------- #
def bidder_to_dict(bidder: Bidder) -> dict:
    contact = bidder.contact or {}
    return {
        "id": bidder.id, "legal_name": bidder.legal_name, "trade_name": bidder.trade_name or "",
        "constitution": bidder.constitution or "", "claimed_flags": bidder.claimed_flags or {},
        "primary_pan": bidder.primary_pan or "",
        "contact": {"email": contact.get("email", ""), "phone": str(contact.get("phone", "")),
                    "address": contact.get("address", "")},
        "identifiers": [
            {"kind": i.kind, "value": i.value, "format_valid": i.format_valid, "source": i.source}
            for i in bidder.identifiers
        ],
    }


# --------------------------------------------------------------------------- #
# Documents / forensics
# --------------------------------------------------------------------------- #
def document_to_dict(doc: Document) -> dict:
    f = doc.forensics or {}
    findings = f.get("findings") or []
    fv = _FORENSIC_VERDICT.get(str(f.get("verdict", "clean")).lower(), "UNVERIFIABLE")
    summary = "; ".join(x.get("detail", "") for x in findings) or "No integrity issues detected"
    incr = sum(1 for x in findings if "incremental" in str(x.get("detail", "")).lower())
    return {
        "id": doc.id, "bidder_id": doc.bidder_id, "doc_type": doc.doc_type,
        "file_hash": doc.file_hash or "", "source": doc.source,
        "extraction_confidence": float((doc.extracted or {}).get("confidence", 0.95)),
        "extracted": {k: v for k, v in (doc.extracted or {}).items() if not k.startswith("_")},
        "forensics": {
            "verdict": fv, "summary": summary,
            "incremental_updates": incr, "ela_note": f.get("method"),
            "copy_move_regions": 0,
        },
        "thumbnail_label": _pretty_doc_type(doc.doc_type),
    }


# --------------------------------------------------------------------------- #
# Checks / score / recommendation / verdict
# --------------------------------------------------------------------------- #
def check_to_dict(cr: Any) -> dict:
    return {
        "key": cr.check_key, "dimension": cr.dimension, "verdict": cr.verdict,
        "confidence": cr.confidence, "summary": cr.summary,
        "source": cr.source or "", "method": cr.method or "", "observed_at": _iso(cr.observed_at),
        "mode": cr.mode or "SIMULATED", "is_veto": cr.is_veto,
        "data": cr.data or {},
        "evidence": [
            {"id": ev.id, "kind": ev.kind, "label": ev.label, "source": ev.source or "",
             "method": ev.method or "", "observed_at": _iso(ev.observed_at),
             "payload": ev.payload or {}, "document_id": ev.document_id}
            for ev in cr.evidence
        ],
    }


def score_to_dict(score: ComplianceScore) -> dict:
    dims = []
    for dim_key, entry in (score.dimension_scores or {}).items():
        dim_vetoes = [
            {"key": v.get("key"), "why": v.get("why", ""), "evidence": []}
            for v in (score.vetoes or []) if v.get("dimension") == dim_key
        ]
        dims.append({
            "name": DIMENSION_NAMES.get(dim_key, dim_key), "dimension": dim_key,
            "weight": entry.get("weight", 0), "score": entry.get("score") or 0,
            "vetoes": dim_vetoes,
        })
    return {
        "score": score.score, "band": score.band, "dimensions": dims,
        "vetoes": [{"key": v.get("key"), "why": v.get("why", ""), "evidence": []}
                   for v in (score.vetoes or [])],
        "reasons_top": _reasons_top(score),
    }


def _reasons_top(score: ComplianceScore) -> list[str]:
    reasons = [f"VETO: {v.get('why') or v.get('key')}" for v in (score.vetoes or [])]
    return reasons[:8]


def recommendation_to_dict(rec: Any) -> dict:
    meta = rec.model_meta or {}
    return {
        "stance": rec.stance, "rationale": rec.rationale,
        "evidence_refs": rec.evidence_refs or [],
        "model_meta": {"provider": meta.get("provider", "heuristic"),
                       "model": meta.get("model", "heuristic"),
                       "mode": meta.get("mode", "SIMULATED")},
    }


def _latest_decision(db: Session, bid_id: str) -> Decision | None:
    return db.execute(
        select(Decision).where(Decision.bid_id == bid_id).order_by(Decision.decided_at.desc()).limit(1)
    ).scalar_one_or_none()


def decision_to_dict(d: Decision, officer_name: str = "") -> dict:
    return {"id": d.id, "outcome": d.outcome, "note": d.note,
            "officer_name": officer_name or "Procurement Officer", "decided_at": _iso(d.decided_at)}


def verdict_for_bid(db: Session, bid: Bid) -> dict:
    run = ensure_run(db, bid.id)
    bidder = bid.bidder
    tender = bid.tender
    checks = sorted(run.check_results, key=lambda c: (not c.is_veto, c.check_key)) if run else []
    duration = None
    if run and run.finished_at and run.started_at:
        duration = max(1, int((run.finished_at - run.started_at).total_seconds()))
    dec = _latest_decision(db, bid.id)
    return {
        "bid": {"id": bid.id, "tender_id": bid.tender_id, "bidder_id": bid.bidder_id,
                "quoted_value": float(bid.quoted_value or 0), "submitted_at": _iso(bid.submitted_at)},
        "bidder": bidder_to_dict(bidder),
        "tender": {"id": tender.id, "ref_no": tender.ref_no, "title": tender.title,
                   "buyer_org": tender.buyer_org},
        "run": {
            "run_id": run.id if run else "", "bid_id": bid.id, "bidder_id": bid.bidder_id,
            "tender_id": bid.tender_id, "status": run.status if run else "failed",
            "provider_mode": run.provider_mode if run else "SIMULATED",
            "started_at": _iso(run.started_at) if run else None,
            "finished_at": _iso(run.finished_at) if run else None,
            "duration_seconds": duration, "checks": [check_to_dict(c) for c in checks],
        },
        "score": score_to_dict(run.score) if run and run.score else {},
        "recommendation": recommendation_to_dict(run.recommendation) if run and run.recommendation else {},
        "documents": [document_to_dict(d) for d in bidder.documents],
        "decision": decision_to_dict(dec) if dec else None,
    }


# --------------------------------------------------------------------------- #
# Comparison matrix
# --------------------------------------------------------------------------- #
def comparison_for_tender(db: Session, tender: Tender) -> dict:
    check_keys: list[str] = []
    for r in tender.requirements:
        if r.check_key not in check_keys:
            check_keys.append(r.check_key)
    for extra in ("pan", "debarment", "cartel"):
        if extra not in check_keys:
            check_keys.append(extra)

    rows = []
    for bid in tender.bids:
        run = ensure_run(db, bid.id)
        by_key = {c.check_key: c for c in (run.check_results if run else [])}
        cells = []
        for k in check_keys:
            cr = by_key.get(k)
            cells.append({"key": k, "verdict": cr.verdict if cr else "NOT_APPLICABLE",
                          "is_veto": bool(cr.is_veto) if cr else False})
        rows.append({
            "bid_id": bid.id, "bidder_id": bid.bidder_id, "bidder_name": bid.bidder.legal_name,
            "cells": cells,
            "score": run.score.score if run and run.score else 0,
            "band": run.score.band if run and run.score else "MEDIUM",
            "recommendation": run.recommendation.stance if run and run.recommendation else "FURTHER_SCRUTINY",
        })
    rows.sort(key=lambda r: r["score"], reverse=True)
    return {"tender_id": tender.id, "check_keys": check_keys, "rows": rows}


# --------------------------------------------------------------------------- #
# Entity graph
# --------------------------------------------------------------------------- #
def graph_for_tender(db: Session, tender_id: str) -> dict:
    from app.compliance import engine  # lazy

    g = engine.build_tender_graph(db, tender_id)
    clusters = []
    node_cluster: dict[str, str] = {}
    for i, c in enumerate(g.get("clusters", [])):
        cid = f"c{i}"
        clusters.append({"id": cid, "bidder_ids": c.get("bidder_ids", []),
                         "reason": c.get("reason", ""), "severity": c.get("severity", "medium")})
        for bid_node in c.get("bidder_ids", []):
            node_cluster[bid_node] = cid
    nodes = [
        {"id": n["id"], "type": n["type"], "value": n["value"],
         "label": n.get("label") or n["value"], "cluster": node_cluster.get(n["id"])}
        for n in g.get("nodes", [])
    ]
    return {"nodes": nodes, "edges": g.get("edges", []), "clusters": clusters}


# --------------------------------------------------------------------------- #
# Audit
# --------------------------------------------------------------------------- #
def audit_event_to_dict(ev: Any) -> dict:
    return {"id": ev.id, "seq": ev.seq, "actor": ev.actor_id or "system", "action": ev.action,
            "target": ev.target or "", "payload": ev.payload or {}, "prev_hash": ev.prev_hash,
            "hash": ev.hash, "created_at": _iso(ev.created_at)}
