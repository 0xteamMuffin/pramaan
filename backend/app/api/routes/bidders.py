"""Bidder routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Bidder
from app.services import serializers

router = APIRouter(prefix="/bidders", tags=["bidders"])


@router.get("")
def list_bidders(db: Session = Depends(get_db)) -> list[dict]:
    bidders = db.execute(select(Bidder).order_by(Bidder.legal_name)).scalars().all()
    return [serializers.bidder_to_dict(b) for b in bidders]


@router.get("/{bidder_id}")
def get_bidder(bidder_id: str, db: Session = Depends(get_db)) -> dict:
    bidder = db.get(Bidder, bidder_id)
    if not bidder:
        raise HTTPException(status_code=404, detail="bidder not found")
    return serializers.bidder_to_dict(bidder)
