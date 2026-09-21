"""Tender routes: list, detail, comparison, graph, evaluate."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Tender, TenderRequirement
from app.services import serializers
from app.services import audit

router = APIRouter(prefix="/tenders", tags=["tenders"])


class RequirementIn(BaseModel):
    check_key: str
    mandatory: bool = True
    params: dict = Field(default_factory=dict)
    weight_override: float | None = None


class TenderCreate(BaseModel):
    title: str
    category: str = "goods"
    buyer_org: str = "CPCL"
    estimated_value: float | None = None
    template_id: str | None = None
    requirements: list[RequirementIn] = Field(default_factory=list)


@router.get("")
def list_tenders(db: Session = Depends(get_db)) -> list[dict]:
    tenders = db.execute(select(Tender).order_by(Tender.ref_no)).scalars().all()
    return [serializers.tender_to_dict(db, t) for t in tenders]


@router.post("", status_code=201)
def create_tender(body: TenderCreate, db: Session = Depends(get_db)) -> dict:
    year = datetime.now(timezone.utc).year
    serial = 26104 + (db.execute(select(func.count(Tender.id))).scalar() or 0)
    tender = Tender(
        ref_no=f"GEM/{year}/B/{serial:07d}", title=body.title, buyer_org=body.buyer_org,
        category=body.category, estimated_value=body.estimated_value,
        template_id=body.template_id, status="open",
    )
    db.add(tender)
    db.flush()
    # sensible always-on checks if the caller sent none
    reqs = body.requirements or [
        RequirementIn(check_key="pan"), RequirementIn(check_key="gst", params={"require_returns": 6}),
        RequirementIn(check_key="debarment"), RequirementIn(check_key="cartel"),
    ]
    for r in reqs:
        db.add(TenderRequirement(tender_id=tender.id, check_key=r.check_key,
                                 mandatory=r.mandatory, params=r.params,
                                 weight_override=r.weight_override))
    db.commit()
    db.refresh(tender)
    audit.record(db, action="tender.created", target=f"tender:{tender.id}",
                 payload={"ref_no": tender.ref_no, "title": tender.title})
    return serializers.tender_to_dict(db, tender, detail=True)


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
