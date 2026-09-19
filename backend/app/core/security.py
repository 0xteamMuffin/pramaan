"""Lightweight auth: hashlib password hashing + PyJWT tokens + RBAC deps.

No bcrypt dependency (keeps install friction low). Demo users are seeded.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

ALGO = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return digest.hex(), salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    calc, _ = hash_password(password, salt)
    return secrets.compare_digest(calc, password_hash)


def create_access_token(subject: str, role: str, extra: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGO)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGO])
    except jwt.PyJWTError as exc:  # pragma: no cover - runtime
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}"
        ) from exc


def get_current_user(
    token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """Return the current User. Auth is soft in dev: missing token => None-safe 401."""
    from app.models import User

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles: str):
    def _dep(user=Depends(get_current_user)):
        if roles and user.role not in roles and user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _dep
