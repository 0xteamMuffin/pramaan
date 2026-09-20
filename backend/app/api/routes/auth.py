"""Auth routes: login, refresh, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_token,
    get_current_user,
    verify_password,
)
from app.models import User
from app.services import audit
from app.services.serializers import user_to_dict

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginReq(BaseModel):
    email: str
    password: str


class RefreshReq(BaseModel):
    refresh_token: str


@router.post("/login")
def login(body: LoginReq, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not verify_password(body.password, user.password_hash, user.salt):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    token = create_access_token(user.id, user.role)
    audit.record(db, action="auth.login", actor_id=user.id, target=f"user:{user.id}",
                 payload={"email": user.email})
    return {"access_token": token, "refresh_token": token, "user": user_to_dict(user)}


@router.post("/refresh")
def refresh(body: RefreshReq, db: Session = Depends(get_db)) -> dict:
    payload = decode_token(body.refresh_token)
    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")
    token = create_access_token(user.id, user.role)
    return {"access_token": token, "refresh_token": token, "user": user_to_dict(user)}


@router.get("/me")
def me(user=Depends(get_current_user)) -> dict:
    return user_to_dict(user)
