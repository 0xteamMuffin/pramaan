"""Bidder routes: list, detail, create, document upload (live extraction + forgery)."""
from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai import extraction as extraction_mod
from app.ai import forgery as forgery_mod
from app.core.config import settings
from app.core.database import get_db
from app.models import Bid, Bidder, Document, Identifier, Tender
from app.services import audit, serializers

router = APIRouter(prefix="/bidders", tags=["bidders"])

_ALLOWED = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}
_MAX_BYTES = 15 * 1024 * 1024


class IdentifierIn(BaseModel):
    kind: str
    value: str


class BidderCreate(BaseModel):
    legal_name: str
    trade_name: str | None = None
    constitution: str | None = None
    primary_pan: str | None = None
    contact: dict = Field(default_factory=dict)
    claimed_flags: dict = Field(default_factory=dict)
    identifiers: list[IdentifierIn] = Field(default_factory=list)
    tender_id: str | None = None
    quoted_value: float | None = None


@router.get("")
def list_bidders(db: Session = Depends(get_db)) -> list[dict]:
    bidders = db.execute(select(Bidder).order_by(Bidder.legal_name)).scalars().all()
    return [serializers.bidder_to_dict(b) for b in bidders]


@router.get("/{bidder_id}")
def get_bidder(bidder_id: str, db: Session = Depends(get_db)) -> dict:
    bidder = db.get(Bidder, bidder_id)
    if not bidder:
        raise HTTPException(status_code=404, detail="bidder not found")
    return serializers.bidder_to_dict(bidder)


@router.post("", status_code=201)
def create_bidder(body: BidderCreate, db: Session = Depends(get_db)) -> dict:
    bidder = Bidder(
        legal_name=body.legal_name, trade_name=body.trade_name, constitution=body.constitution,
        primary_pan=(body.primary_pan or "").upper() or None, contact=body.contact,
        claimed_flags=body.claimed_flags,
    )
    db.add(bidder)
    db.flush()
    for ident in body.identifiers:
        if ident.value:
            db.add(Identifier(bidder_id=bidder.id, kind=ident.kind.upper(),
                              value=ident.value.upper(), format_valid=True, source="declared"))
    bid_id = None
    if body.tender_id:
        tender = db.get(Tender, body.tender_id)
        if tender is None:
            raise HTTPException(status_code=404, detail="tender not found")
        bid = Bid(tender_id=tender.id, bidder_id=bidder.id, quoted_value=body.quoted_value,
                  submission_meta={"session": bidder.id[:8], "device": "web"})
        db.add(bid)
        db.flush()
        bid_id = bid.id
    db.commit()
    db.refresh(bidder)
    audit.record(db, action="bidder.created", target=f"bidder:{bidder.id}",
                 payload={"legal_name": bidder.legal_name})
    out = serializers.bidder_to_dict(bidder)
    out["bid_id"] = bid_id
    return out


@router.post("/{bidder_id}/documents", status_code=201)
async def upload_document(
    bidder_id: str,
    doc_type: str = Form("uploaded_document"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    """Upload a certificate, run OCR extraction + forensic analysis immediately."""
    bidder = db.get(Bidder, bidder_id)
    if not bidder:
        raise HTTPException(status_code=404, detail="bidder not found")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"unsupported file type '{ext}'")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="empty file")
    if len(content) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large (max 15 MB)")

    dest_dir = Path(settings.storage_dir) / bidder_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{uuid.uuid4().hex}{ext}"
    dest.write_bytes(content)
    file_hash = hashlib.sha256(content).hexdigest()

    doc = Document(bidder_id=bidder_id, doc_type=doc_type, storage_uri=str(dest),
                   file_hash=file_hash, source="uploaded", extracted={}, forensics={})
    db.add(doc)
    db.flush()

    # Live AI pass: OCR extraction (real if a key is set, else best-effort) + forensics.
    try:
        extraction_mod.extract_document(db, doc)
    except Exception as exc:  # noqa: BLE001
        audit.record(db, action="extraction.error", target=f"doc:{doc.id}",
                     payload={"error": str(exc)}, commit=False)
    try:
        doc.forensics = forgery_mod.analyze_document(doc)
    except Exception as exc:  # noqa: BLE001
        doc.forensics = {"verdict": "unknown", "score": 0.0, "findings": [{"detail": str(exc)}]}

    db.add(doc)
    db.commit()
    db.refresh(doc)
    audit.record(db, action="document.uploaded", target=f"doc:{doc.id}",
                 payload={"bidder_id": bidder_id, "doc_type": doc_type,
                          "forensic_verdict": (doc.forensics or {}).get("verdict")})
    return serializers.document_to_dict(doc)
