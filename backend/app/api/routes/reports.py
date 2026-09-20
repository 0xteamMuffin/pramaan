"""Report route: per-bid audit report as PDF."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Bid
from app.services import report

router = APIRouter(prefix="/bids", tags=["reports"])


def _resolve_bid(db: Session, id_: str) -> Bid | None:
    bid = db.get(Bid, id_)
    if bid is not None:
        return bid
    return db.execute(
        select(Bid).where(Bid.bidder_id == id_).order_by(Bid.submitted_at.desc()).limit(1)
    ).scalar_one_or_none()


@router.get("/{bid_id}/report.pdf")
def report_pdf(bid_id: str, db: Session = Depends(get_db)) -> Response:
    bid = _resolve_bid(db, bid_id)
    if not bid:
        raise HTTPException(status_code=404, detail="bid/bidder not found")
    pdf = report.build_pdf(db, bid.id)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="pramaan-audit-{bid.id[:8]}.pdf"'},
    )
