"""Analytics routes: dashboard summary, time-savings."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import analytics

router = APIRouter(prefix="/metrics", tags=["analytics"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)) -> dict:
    return analytics.dashboard_summary(db)


@router.get("/time-savings")
def time_savings(db: Session = Depends(get_db)) -> dict:
    return analytics.time_savings(db)
