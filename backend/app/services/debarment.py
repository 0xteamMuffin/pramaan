"""Debarment / blacklist fuzzy screening over the snapshot dataset.

Matches on name (fuzzy) + exact PAN/CIN/DIN to defeat re-incorporation.
Spec: docs/01-research/govt-portal-api-availability.md (World Bank + CPPP snapshots)
"""
from __future__ import annotations

from typing import Any

from rapidfuzz import fuzz
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DebarmentRecord

NAME_MATCH_THRESHOLD = 86  # token_set_ratio


def _rec_to_dict(rec: DebarmentRecord, score: float, reason: str) -> dict[str, Any]:
    return {
        "id": rec.id, "source": rec.source, "entity_name": rec.entity_name,
        "pan": rec.pan, "cin": rec.cin, "din": rec.din, "grounds": rec.grounds,
        "from_date": rec.from_date, "to_date": rec.to_date, "captured_at": rec.captured_at,
        "match_score": round(score, 1), "match_reason": reason,
    }


def search(
    db: Session,
    *,
    q: str | None = None,
    pan: str | None = None,
    cin: str | None = None,
    din: str | None = None,
    dins: list[str] | None = None,
    limit: int = 25,
) -> list[dict[str, Any]]:
    """Return matching debarment records with score + reason."""
    records = db.execute(select(DebarmentRecord)).scalars().all()
    din_set = {d.upper() for d in (dins or []) if d}
    if din:
        din_set.add(din.upper())

    out: list[dict[str, Any]] = []
    for rec in records:
        best = 0.0
        reason = ""
        if pan and rec.pan and rec.pan.upper() == pan.upper():
            best, reason = 100.0, "exact PAN match"
        elif cin and rec.cin and rec.cin.upper() == cin.upper():
            best, reason = 100.0, "exact CIN match"
        elif din_set and rec.din and rec.din.upper() in din_set:
            best, reason = 100.0, "director DIN match"
        elif q:
            s = fuzz.token_set_ratio((q or "").lower(), (rec.entity_name or "").lower())
            if s >= NAME_MATCH_THRESHOLD:
                best, reason = float(s), f"name similarity {int(s)}%"
        if best:
            out.append(_rec_to_dict(rec, best, reason))

    out.sort(key=lambda r: r["match_score"], reverse=True)
    return out[:limit]


def screen_bidder(db: Session, *, name: str, pan: str | None, cin: str | None, dins: list[str]) -> list[dict[str, Any]]:
    """Convenience wrapper used by the compliance debarment check."""
    return search(db, q=name, pan=pan, cin=cin, dins=dins)
