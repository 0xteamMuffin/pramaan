"""Audit routes: list events, verify chain integrity."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AuditEvent
from app.services import audit as audit_service
from app.services.serializers import audit_event_to_dict

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_events(limit: int = 200, db: Session = Depends(get_db)) -> list[dict]:
    events = db.execute(
        select(AuditEvent).order_by(AuditEvent.seq.desc()).limit(limit)
    ).scalars().all()
    return [audit_event_to_dict(e) for e in events]


@router.get("/verify")
def verify(db: Session = Depends(get_db)) -> dict:
    return audit_service.verify_chain(db)
