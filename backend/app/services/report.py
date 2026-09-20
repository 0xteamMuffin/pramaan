"""Officer audit report (PDF) via reportlab (pure-python, no system libs)."""
from __future__ import annotations

import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models import Bid
from app.services import serializers

NAVY = colors.HexColor("#05256E")
SAFFRON = colors.HexColor("#F5821F")
INK = colors.HexColor("#334155")
GREEN = colors.HexColor("#1A7F37")
AMBER = colors.HexColor("#C77700")
RED = colors.HexColor("#C0392B")
_BAND = {"LOW": GREEN, "MEDIUM": AMBER, "HIGH": RED}


def build_pdf(db: Session, bid_id: str) -> bytes:
    bid = db.get(Bid, bid_id)
    if bid is None:
        raise ValueError(f"Bid not found: {bid_id}")
    v = serializers.verdict_for_bid(db, bid)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 20 * mm

    # Header
    c.setFillColor(NAVY)
    c.rect(0, h - 16 * mm, w, 16 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(15 * mm, h - 11 * mm, "PRAMAAN — Bid Compliance Audit Report")
    c.setFillColor(SAFFRON)
    c.rect(0, h - 17 * mm, w, 1 * mm, fill=1, stroke=0)
    y = h - 24 * mm

    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(15 * mm, y, "Decision-support document — the Procurement Officer makes the final decision.")
    y -= 8 * mm

    def line(label: str, value: str, bold: bool = False) -> None:
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
        c.setFillColor(INK)
        c.drawString(15 * mm, y, f"{label}: ")
        c.setFont("Helvetica", 9)
        c.drawString(55 * mm, y, str(value)[:110])
        y -= 5.5 * mm

    bidder = v["bidder"]
    tender = v["tender"]
    score = v.get("score", {})
    rec = v.get("recommendation", {})

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(15 * mm, y, "Tender & Bidder")
    y -= 6 * mm
    line("Tender", f"{tender['ref_no']} — {tender['title']}")
    line("Buyer", tender["buyer_org"])
    line("Bidder", bidder["legal_name"])
    line("Constitution", bidder["constitution"])
    line("PAN", bidder["primary_pan"])

    # Verdict
    y -= 3 * mm
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(15 * mm, y, "Compliance Verdict")
    y -= 7 * mm
    band = score.get("band", "MEDIUM")
    c.setFillColor(_BAND.get(band, AMBER))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(15 * mm, y, f"{score.get('score', 0)}/100")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(45 * mm, y + 2 * mm, f"Risk band: {band}")
    c.setFillColor(INK)
    y -= 9 * mm
    c.setFont("Helvetica", 9)
    c.drawString(15 * mm, y, f"AI recommendation (advisory): {rec.get('stance', 'N/A')}")
    y -= 6 * mm

    # Top reasons / vetoes
    for reason in (score.get("reasons_top") or [])[:6]:
        c.setFillColor(RED if reason.startswith("VETO") else INK)
        c.setFont("Helvetica", 8.5)
        c.drawString(18 * mm, y, f"• {reason[:105]}")
        y -= 4.8 * mm
    c.setFillColor(INK)

    # Checks table
    y -= 3 * mm
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(NAVY)
    c.drawString(15 * mm, y, "Verification Checks")
    y -= 6 * mm
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(INK)
    c.drawString(15 * mm, y, "Check")
    c.drawString(55 * mm, y, "Verdict")
    c.drawString(80 * mm, y, "Source / Method")
    c.drawString(140 * mm, y, "Mode")
    y -= 4 * mm
    c.line(15 * mm, y, w - 15 * mm, y)
    y -= 4 * mm
    for chk in v["run"].get("checks", []):
        if y < 25 * mm:
            c.showPage()
            y = h - 20 * mm
        vd = chk["verdict"]
        col = GREEN if vd == "PASS" else RED if vd in ("FAIL",) else AMBER if vd == "WARN" else INK
        c.setFont("Helvetica", 8)
        c.setFillColor(INK)
        c.drawString(15 * mm, y, chk["key"][:22])
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(55 * mm, y, vd + (" ⚠" if chk["is_veto"] else ""))
        c.setFillColor(INK)
        c.setFont("Helvetica", 7.5)
        c.drawString(80 * mm, y, f"{(chk['source'] or '')[:38]} / {chk['method'] or ''}"[:52])
        c.drawString(140 * mm, y, chk["mode"])
        y -= 4.6 * mm

    # Footer with provenance + integrity note
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(INK)
    stamp = datetime.now(timezone.utc).strftime("%d %b %Y %H:%M UTC")
    c.drawString(15 * mm, 12 * mm,
                 f"Generated {stamp} · PRAMAAN (SIH PS-26100) · Not an official Government of India document.")
    c.showPage()
    c.save()
    return buf.getvalue()
