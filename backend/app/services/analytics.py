"""Dashboard + time-savings analytics."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Bid, Decision, Tender, VerificationRun
from app.services import serializers

MANUAL_MINUTES_PER_BIDDER = 180  # ~3 hours of manual multi-portal checking
PRAMAAN_SECONDS_PER_BIDDER = 90  # headline engine speed per bidder
# Residual officer review time with PRAMAAN assistance (reading the verdict +
# spot-checking evidence). Effort reduction is measured against THIS, giving the
# PS-aligned 60-80% figure rather than an overclaimed ~99%.
ASSISTED_MINUTES_PER_BIDDER = 45


def _alert_kind(veto_key: str) -> str:
    return {
        "debarment": "debarment", "doc_integrity": "forgery", "oem": "forgery",
        "cartel": "cartel", "pan": "mismatch", "gst": "mismatch",
    }.get(veto_key, "info")


def time_savings(db: Session, bidders_processed: int | None = None) -> dict:
    n = bidders_processed if bidders_processed is not None else db.query(Bid).count()
    saved_minutes = n * (MANUAL_MINUTES_PER_BIDDER - ASSISTED_MINUTES_PER_BIDDER)
    reduction = round(
        (1 - (ASSISTED_MINUTES_PER_BIDDER / MANUAL_MINUTES_PER_BIDDER)) * 100, 1
    ) if MANUAL_MINUTES_PER_BIDDER else 0.0
    saved_seconds = saved_minutes * 60
    return {
        "manual_minutes_per_bidder": MANUAL_MINUTES_PER_BIDDER,
        "pramaan_seconds_per_bidder": PRAMAAN_SECONDS_PER_BIDDER,
        "bidders_processed": n,
        "hours_saved": round(saved_seconds / 3600, 1),
        "reduction_pct": reduction,
    }


def dashboard_summary(db: Session) -> dict:
    bids = db.execute(select(Bid)).scalars().all()
    scores: list[int] = []
    red_flags = 0
    recent = []
    alerts = []
    for bid in bids:
        run = serializers.ensure_run(db, bid.id)
        if not run or not run.score:
            continue
        scores.append(run.score.score)
        if run.score.band == "HIGH":
            red_flags += 1
        recent.append({
            "run_id": run.id, "bid_id": bid.id, "bidder_name": bid.bidder.legal_name,
            "tender_ref": bid.tender.ref_no, "status": run.status, "band": run.score.band,
            "score": run.score.score, "finished_at": serializers._iso(run.finished_at),
        })
        for v in (run.score.vetoes or []):
            alerts.append({
                "id": f"al-{bid.id}-{v.get('key')}", "kind": _alert_kind(v.get("key", "")),
                "severity": "high", "title": f"{v.get('key', '').replace('_', ' ').title()} — {bid.bidder.legal_name}",
                "detail": v.get("why", ""), "bidder_id": bid.bidder_id, "tender_id": bid.tender_id,
                "created_at": serializers._iso(run.finished_at),
            })
    recent.sort(key=lambda r: r["finished_at"] or "", reverse=True)
    tenders_in_eval = db.query(Tender).filter(Tender.status.in_(["open", "evaluating"])).count()
    decided = {d.bid_id for d in db.execute(select(Decision)).scalars().all()}
    pending = sum(1 for b in bids if b.id not in decided)
    avg = round(sum(scores) / len(scores)) if scores else 0
    return {
        "tenders_in_evaluation": tenders_in_eval,
        "bidders_pending": pending,
        "avg_score": avg,
        "red_flags": red_flags,
        "time_savings": time_savings(db, bidders_processed=len(scores)),
        "recent_runs": recent[:8],
        "alerts": alerts[:10],
    }
