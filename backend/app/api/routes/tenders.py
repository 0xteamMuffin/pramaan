"""Tender routes: list, detail, comparison, graph, evaluate."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Tender
from app.services import serializers
from app.services import audit

router = APIRouter(prefix="/tenders", tags=["tenders"])


@router.get("")
def list_tenders(db: Session = Depends(get_db)) -> list[dict]:
    tenders = db.execute(select(Tender).order_by(Tender.ref_no)).scalars().all()
    return [serializers.tender_to_dict(db, t) for t in tenders]


@router.get("/{tender_id}")
def get_tender(tender_id: str, db: Session = Depends(get_db)) -> dict:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="tender not found")
    return serializers.tender_to_dict(db, tender, detail=True)


@router.get("/{tender_id}/comparison")
def comparison(tender_id: str, db: Session = Depends(get_db)) -> dict:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="tender not found")
    return serializers.comparison_for_tender(db, tender)


@router.get("/{tender_id}/graph")
def graph(tender_id: str, db: Session = Depends(get_db)) -> dict:
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="tender not found")
    # ensure runs exist so graph attributes are populated
    for bid in tender.bids:
        serializers.ensure_run(db, bid.id)
    return serializers.graph_for_tender(db, tender_id)


@router.post("/{tender_id}/evaluate")
def evaluate_all(tender_id: str, db: Session = Depends(get_db)) -> dict:
    from app.compliance import engine

    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="tender not found")
    n = 0
    for bid in tender.bids:
        engine.run_verification(db, bid.id)
        n += 1
    audit.record(db, action="tender.evaluated", target=f"tender:{tender_id}", payload={"bids": n})
    return {"queued": n}
