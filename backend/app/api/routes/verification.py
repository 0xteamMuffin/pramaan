"""Verification routes: verdict aggregate, run verify, record decision.

`/bids/{id}/verdict` resolves `id` as a Bid id OR a Bidder id (latest bid) so
the frontend can navigate from either a bid row or a bidder page.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, oauth2_scheme, decode_token
from app.models import Bid, Decision
from app.services import audit, serializers

router = APIRouter(prefix="/bids", tags=["verification"])


def _resolve_bid(db: Session, id_: str) -> Bid | None:
    bid = db.get(Bid, id_)
    if bid is not None:
        return bid
    # treat as bidder id -> latest bid
    return db.execute(
        select(Bid).where(Bid.bidder_id == id_).order_by(Bid.submitted_at.desc()).limit(1)
    ).scalar_one_or_none()


class DecisionReq(BaseModel):
    outcome: str
    note: str = ""


@router.get("/{bid_id}/verdict")
def verdict(bid_id: str, db: Session = Depends(get_db)) -> dict:
    bid = _resolve_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="bid/bidder not found")
    return serializers.verdict_for_bid(db, bid)


@router.post("/{bid_id}/verify")
def verify(bid_id: str, db: Session = Depends(get_db)) -> dict:
    from app.compliance import engine

    bid = _resolve_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="bid/bidder not found")
    run = engine.run_verification(db, bid.id)
    return {"run_id": run.id, "status": run.status}


@router.post("/{bid_id}/decision")
def record_decision(
    bid_id: str,
    body: DecisionReq,
    db: Session = Depends(get_db),
    token: str | None = Depends(oauth2_scheme),
) -> dict:
    bid = _resolve_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="bid/bidder not found")
    if body.outcome not in ("QUALIFIED", "DISQUALIFIED", "ON_HOLD"):
        raise HTTPException(status_code=400, detail="invalid outcome")

    officer_id, officer_name = None, "Procurement Officer"
    if token:
        try:
            from app.models import User

            payload = decode_token(token)
            user = db.get(User, payload.get("sub"))
            if user:
                officer_id, officer_name = user.id, user.name
        except Exception:  # noqa: BLE001
            pass

    dec = Decision(bid_id=bid.id, officer_id=officer_id, outcome=body.outcome, note=body.note)
    db.add(dec)
    db.commit()
    db.refresh(dec)
    audit.record(db, action="decision.recorded", actor_id=officer_id, target=f"bid:{bid.id}",
                 payload={"outcome": body.outcome, "note": body.note[:200]})
    return serializers.decision_to_dict(dec, officer_name)
