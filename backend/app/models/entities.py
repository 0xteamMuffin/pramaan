"""SQLAlchemy ORM models. Canonical spec: docs/03-architecture/data-model.md.

Evidence-first, audit-first. AI recommendation and human decision are separate.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# --------------------------------------------------------------------------- #
# Users / auth
# --------------------------------------------------------------------------- #
class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="OFFICER")
    password_hash: Mapped[str] = mapped_column(String(255))
    salt: Mapped[str] = mapped_column(String(64))


# --------------------------------------------------------------------------- #
# Tenders & rules (rules-as-data)
# --------------------------------------------------------------------------- #
class Tender(Base, TimestampMixin):
    __tablename__ = "tenders"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    ref_no: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(512))
    buyer_org: Mapped[str] = mapped_column(String(255), default="CPCL")
    category: Mapped[str] = mapped_column(String(32), default="goods")  # goods/services/works
    estimated_value: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    template_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_by: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id"), nullable=True)

    requirements: Mapped[list["TenderRequirement"]] = relationship(
        back_populates="tender", cascade="all, delete-orphan"
    )
    bids: Mapped[list["Bid"]] = relationship(back_populates="tender", cascade="all, delete-orphan")


class TenderRequirement(Base):
    __tablename__ = "tender_requirements"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    tender_id: Mapped[str] = mapped_column(String(32), ForeignKey("tenders.id"), index=True)
    check_key: Mapped[str] = mapped_column(String(64))
    mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    weight_override: Mapped[float | None] = mapped_column(Float, nullable=True)

    tender: Mapped["Tender"] = relationship(back_populates="requirements")


# --------------------------------------------------------------------------- #
# Bidders, identifiers, documents
# --------------------------------------------------------------------------- #
class Bidder(Base, TimestampMixin):
    __tablename__ = "bidders"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    legal_name: Mapped[str] = mapped_column(String(512))
    trade_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    constitution: Mapped[str | None] = mapped_column(String(64), nullable=True)
    claimed_flags: Mapped[dict] = mapped_column(JSON, default=dict)  # MSE class, startup, MII class, OEM
    primary_pan: Mapped[str | None] = mapped_column(String(16), index=True, nullable=True)
    contact: Mapped[dict] = mapped_column(JSON, default=dict)  # email, phone, address, bank, ip

    identifiers: Mapped[list["Identifier"]] = relationship(
        back_populates="bidder", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="bidder", cascade="all, delete-orphan"
    )


class Identifier(Base):
    __tablename__ = "identifiers"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    bidder_id: Mapped[str] = mapped_column(String(32), ForeignKey("bidders.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    value: Mapped[str] = mapped_column(String(64), index=True)
    format_valid: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(32), default="declared")  # extracted/portal/declared

    bidder: Mapped["Bidder"] = relationship(back_populates="identifiers")


class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    bidder_id: Mapped[str] = mapped_column(String(32), ForeignKey("bidders.id"), index=True)
    doc_type: Mapped[str] = mapped_column(String(64))
    storage_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    source: Mapped[str] = mapped_column(String(32), default="uploaded")  # uploaded/digilocker
    extracted: Mapped[dict] = mapped_column(JSON, default=dict)
    forensics: Mapped[dict] = mapped_column(JSON, default=dict)

    bidder: Mapped["Bidder"] = relationship(back_populates="documents")


# --------------------------------------------------------------------------- #
# Bids & verification
# --------------------------------------------------------------------------- #
class Bid(Base, TimestampMixin):
    __tablename__ = "bids"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    tender_id: Mapped[str] = mapped_column(String(32), ForeignKey("tenders.id"), index=True)
    bidder_id: Mapped[str] = mapped_column(String(32), ForeignKey("bidders.id"), index=True)
    quoted_value: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    submission_meta: Mapped[dict] = mapped_column(JSON, default=dict)  # ip, session, device (cartel)

    tender: Mapped["Tender"] = relationship(back_populates="bids")
    bidder: Mapped["Bidder"] = relationship()
    runs: Mapped[list["VerificationRun"]] = relationship(
        back_populates="bid", cascade="all, delete-orphan"
    )
    decisions: Mapped[list["Decision"]] = relationship(
        back_populates="bid", cascade="all, delete-orphan"
    )


class VerificationRun(Base):
    __tablename__ = "verification_runs"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    bid_id: Mapped[str] = mapped_column(String(32), ForeignKey("bids.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    provider_mode: Mapped[str] = mapped_column(String(16), default="SIMULATED")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    manual_seconds_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)

    bid: Mapped["Bid"] = relationship(back_populates="runs")
    check_results: Mapped[list["CheckResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    score: Mapped["ComplianceScore | None"] = relationship(
        back_populates="run", cascade="all, delete-orphan", uselist=False
    )
    recommendation: Mapped["Recommendation | None"] = relationship(
        back_populates="run", cascade="all, delete-orphan", uselist=False
    )


class CheckResult(Base):
    __tablename__ = "check_results"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(String(32), ForeignKey("verification_runs.id"), index=True)
    check_key: Mapped[str] = mapped_column(String(64))
    dimension: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verdict: Mapped[str] = mapped_column(String(24))
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    summary: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    is_veto: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mode: Mapped[str | None] = mapped_column(String(16), nullable=True)  # LIVE/SIMULATED/SNAPSHOT
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped["VerificationRun"] = relationship(back_populates="check_results")
    evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="check_result", cascade="all, delete-orphan"
    )


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    check_result_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("check_results.id"), index=True
    )
    kind: Mapped[str] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(512))
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    method: Mapped[str | None] = mapped_column(String(64), nullable=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    document_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("documents.id"), nullable=True)

    check_result: Mapped["CheckResult"] = relationship(back_populates="evidence")


class ComplianceScore(Base):
    __tablename__ = "compliance_scores"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(String(32), ForeignKey("verification_runs.id"), index=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    band: Mapped[str] = mapped_column(String(16), default="MEDIUM")
    dimension_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    vetoes: Mapped[list] = mapped_column(JSON, default=list)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped["VerificationRun"] = relationship(back_populates="score")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    run_id: Mapped[str] = mapped_column(String(32), ForeignKey("verification_runs.id"), index=True)
    stance: Mapped[str] = mapped_column(String(32))
    rationale: Mapped[str] = mapped_column(Text, default="")
    evidence_refs: Mapped[list] = mapped_column(JSON, default=list)
    model_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped["VerificationRun"] = relationship(back_populates="recommendation")


class Decision(Base):
    """Human officer decision — deliberately separate from the AI recommendation."""

    __tablename__ = "decisions"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    bid_id: Mapped[str] = mapped_column(String(32), ForeignKey("bids.id"), index=True)
    officer_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("users.id"), nullable=True)
    outcome: Mapped[str] = mapped_column(String(24))
    note: Mapped[str] = mapped_column(Text, default="")
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    bid: Mapped["Bid"] = relationship(back_populates="decisions")


# --------------------------------------------------------------------------- #
# Entity-resolution graph
# --------------------------------------------------------------------------- #
class EntityNode(Base):
    __tablename__ = "entity_nodes"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    type: Mapped[str] = mapped_column(String(32), index=True)  # bidder/pan/gstin/cin/din/address/...
    value: Mapped[str] = mapped_column(String(512), index=True)
    label: Mapped[str | None] = mapped_column(String(512), nullable=True)


class EntityEdge(Base):
    __tablename__ = "entity_edges"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    src_id: Mapped[str] = mapped_column(String(32), ForeignKey("entity_nodes.id"), index=True)
    dst_id: Mapped[str] = mapped_column(String(32), ForeignKey("entity_nodes.id"), index=True)
    relation: Mapped[str] = mapped_column(String(64))
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    run_ids: Mapped[list] = mapped_column(JSON, default=list)


# --------------------------------------------------------------------------- #
# Audit & provenance
# --------------------------------------------------------------------------- #
class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    seq: Mapped[int] = mapped_column(Integer, autoincrement=True, unique=True)
    actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    prev_hash: Mapped[str] = mapped_column(String(64), default="")
    hash: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ProviderCall(Base):
    __tablename__ = "provider_calls"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    provider: Mapped[str] = mapped_column(String(64))
    mode: Mapped[str] = mapped_column(String(16))
    request_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    response_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    called_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DebarmentRecord(Base):
    __tablename__ = "debarment_records"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String(32))  # worldbank/cppp/ministry
    entity_name: Mapped[str] = mapped_column(String(512), index=True)
    pan: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    cin: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    din: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    grounds: Mapped[str] = mapped_column(Text, default="")
    from_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    to_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    captured_at: Mapped[str | None] = mapped_column(String(32), nullable=True)
