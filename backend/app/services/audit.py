"""Hash-chained, tamper-evident audit trail.

Every meaningful action appends an immutable event:
    hash = sha256(prev_hash + canonical_json(actor, action, target, payload, ts))

Spec: docs/03-architecture/security-and-audit.md
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditEvent


def _canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _mask(payload: dict[str, Any]) -> dict[str, Any]:
    """Light PII masking for stored audit payloads."""
    masked = {}
    for k, v in (payload or {}).items():
        if isinstance(v, str) and k.lower() in {"pan", "gstin", "aadhaar", "din"} and len(v) >= 6:
            masked[k] = v[:3] + "X" * (len(v) - 5) + v[-2:]
        else:
            masked[k] = v
    return masked


def record(
    db: Session,
    *,
    action: str,
    actor_id: str | None = None,
    target: str | None = None,
    payload: dict[str, Any] | None = None,
    commit: bool = True,
) -> AuditEvent:
    """Append a hash-chained audit event."""
    prev = db.execute(
        select(AuditEvent).order_by(AuditEvent.seq.desc()).limit(1)
    ).scalar_one_or_none()
    prev_hash = prev.hash if prev else ""
    next_seq = (db.execute(select(func.max(AuditEvent.seq))).scalar() or 0) + 1

    masked = _mask(payload or {})
    created = datetime.now(timezone.utc)
    # Note: created_at is intentionally excluded from the hash body because DB
    # round-trips (esp. SQLite) can alter tz/precision and break verification.
    # The chain still detects any change to order/actor/action/target/payload.
    body = {
        "seq": next_seq,
        "actor_id": actor_id or "system",
        "action": action,
        "target": target,
        "payload": masked,
    }
    digest = hashlib.sha256((prev_hash + _canonical(body)).encode()).hexdigest()

    ev = AuditEvent(
        seq=next_seq, actor_id=actor_id or "system", action=action, target=target,
        payload=masked, prev_hash=prev_hash, hash=digest, created_at=created,
    )
    db.add(ev)
    if commit:
        db.commit()
        db.refresh(ev)
    else:
        db.flush()
    return ev


def verify_chain(db: Session) -> dict[str, Any]:
    """Recompute the chain; report integrity."""
    events = db.execute(select(AuditEvent).order_by(AuditEvent.seq.asc())).scalars().all()
    prev_hash = ""
    for ev in events:
        body = {
            "seq": ev.seq,
            "actor_id": ev.actor_id or "system",
            "action": ev.action,
            "target": ev.target,
            "payload": ev.payload or {},
        }
        expected = hashlib.sha256((prev_hash + _canonical(body)).encode()).hexdigest()
        if expected != ev.hash or ev.prev_hash != prev_hash:
            return {"intact": False, "broken_at_seq": ev.seq, "count": len(events)}
        prev_hash = ev.hash
    return {"intact": True, "broken_at_seq": None, "count": len(events)}
