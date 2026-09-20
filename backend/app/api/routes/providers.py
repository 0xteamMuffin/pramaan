"""Provider config routes: state, per-check mode toggle, global offline."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.providers import control
from app.services import audit

router = APIRouter(prefix="/providers", tags=["providers"])


class ModeReq(BaseModel):
    mode: str


class OfflineReq(BaseModel):
    offline: bool


@router.get("")
def get_providers() -> dict:
    return control.provider_state()


@router.patch("/{check_key}")
def set_mode(check_key: str, body: ModeReq, db: Session = Depends(get_db)) -> dict:
    control.set_mode(check_key, body.mode)
    audit.record(db, action="provider.mode_changed", target=f"provider:{check_key}",
                 payload={"mode": body.mode})
    return {"ok": True}


@router.post("/offline")
def set_offline(body: OfflineReq, db: Session = Depends(get_db)) -> dict:
    control.set_offline(body.offline)
    audit.record(db, action="provider.offline", target="providers",
                 payload={"offline": body.offline})
    return {"offline": body.offline}
