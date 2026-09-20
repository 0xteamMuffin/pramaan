"""Debarment search route."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import debarment as debarment_service

router = APIRouter(prefix="/debarment", tags=["debarment"])


@router.get("/search")
def search(
    q: str | None = None,
    pan: str | None = None,
    cin: str | None = None,
    din: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    if not any([q, pan, cin, din]):
        return []
    results = debarment_service.search(db, q=q, pan=pan, cin=cin, din=din)
    # normalize match_score to 0-1 for the frontend
    for r in results:
        r["match_score"] = round((r.get("match_score", 0) or 0) / 100.0, 3)
    return results
