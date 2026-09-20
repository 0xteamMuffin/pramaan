"""Synthetic certificate documents.

- `default_extracted()` builds the field dict a doc-type's OCR would yield (what
  FixtureOCR returns and the checks read).
- `write_cert_pdf()` renders a simple, realistic certificate PDF with reportlab.
  When `tamper=True` it appends a second body + extra %%EOF so the forensic
  incremental-update detector has a genuine signal (in addition to the planted
  `_tamper` marker carried in `extracted`).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

_TITLES = {
    "udyam_certificate": "UDYAM REGISTRATION CERTIFICATE — Ministry of MSME",
    "gst_certificate": "GOODS & SERVICES TAX — CERTIFICATE OF REGISTRATION",
    "pan_card": "INCOME TAX DEPARTMENT — PERMANENT ACCOUNT NUMBER",
    "oem_maf": "MANUFACTURER'S AUTHORIZATION FORM (MAF)",
    "bis_certificate": "BUREAU OF INDIAN STANDARDS — LICENCE",
    "turnover_certificate": "CHARTERED ACCOUNTANT'S TURNOVER CERTIFICATE",
    "epfo_certificate": "EPFO — ESTABLISHMENT REGISTRATION",
    "esic_certificate": "ESIC — EMPLOYER REGISTRATION",
    "startup_certificate": "DPIIT — CERTIFICATE OF RECOGNITION (STARTUP INDIA)",
}


def default_extracted(doc_type: str, bidder: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    """Field dict FixtureOCR returns for a document (merged with overrides)."""
    idmap = bidder["identifiers"]
    name = bidder["legal_name"]
    base: dict[str, Any] = {"name": name, "holder_name": name, "doc_type": doc_type}

    if doc_type == "udyam_certificate":
        base.update({
            "udyam_no": idmap.get("udyam"), "udyam": idmap.get("udyam"),
            "enterprise_name": name, "enterprise_type": bidder["flags"].get("mse_class", "Small"),
            "pan": bidder["declared_pan"], "nic": ["28120"],
        })
    elif doc_type == "gst_certificate":
        base.update({
            "gstin": idmap.get("gstin"), "legal_name": name, "trade_name": bidder.get("trade_name"),
            "pan": bidder["gstin_pan"], "status": "Active",
        })
    elif doc_type == "pan_card":
        base.update({"pan": bidder["declared_pan"], "pan_no": bidder["declared_pan"]})
    elif doc_type == "oem_maf":
        base.update({
            "brand": bidder["flags"].get("quoted_brand"), "oem": bidder["flags"].get("quoted_brand"),
            "manufacturer": bidder["flags"].get("quoted_brand"),
            "reseller": name, "valid_till": "2028-03-31",
        })
    elif doc_type == "bis_certificate":
        base.update({
            "bis": idmap.get("bis"), "licence": idmap.get("bis"),
            "license_holder": name, "brand": bidder["flags"].get("quoted_brand"),
            "valid_till": "2027-12-31",
        })
    elif doc_type == "turnover_certificate":
        base.update({"turnover": bidder["flags"].get("turnover")})
    elif doc_type == "epfo_certificate":
        base.update({"epfo": idmap.get("epfo"), "status": "Active"})
    elif doc_type == "esic_certificate":
        base.update({"esic": idmap.get("esic"), "status": "Active"})
    elif doc_type == "startup_certificate":
        base.update({"dpiit": idmap.get("dpiit"), "recognition_no": idmap.get("dpiit"),
                     "status": "Recognized"})

    base.update(overrides or {})
    return {k: v for k, v in base.items() if v is not None}


def write_cert_pdf(path: Path, doc_type: str, bidder: dict[str, Any], fields: dict[str, Any]) -> str:
    """Render a certificate PDF; return the file path. Deterministic content."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tamper = bool(fields.get("_tamper"))
    title = _TITLES.get(doc_type, doc_type.replace("_", " ").title())

    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    y = height - 30 * mm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20 * mm, y, "GOVERNMENT OF INDIA (SYNTHETIC / DEMO DOCUMENT)")
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, y, title)
    y -= 6 * mm
    c.setLineWidth(0.5)
    c.line(20 * mm, y, width - 20 * mm, y)
    y -= 10 * mm

    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"Entity: {bidder['legal_name']}")
    y -= 6 * mm
    for k, v in fields.items():
        if k.startswith("_") or v is None:
            continue
        c.drawString(20 * mm, y, f"{k.replace('_', ' ').title()}: {v}")
        y -= 6 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 30 * mm
            c.setFont("Helvetica", 10)

    c.setFont("Helvetica-Oblique", 8)
    c.drawString(20 * mm, 15 * mm, "Not an official Government of India document. Generated for PRAMAAN demo.")
    c.save()

    if tamper:
        # Append a second incremental save so the PDF carries >1 %%EOF — a genuine
        # post-signing edit signal the forensic layer detects.
        with open(path, "ab") as fh:
            fh.write(b"\n% incremental update (simulated post-signing edit)\n")
            fh.write(b"1 0 obj\n<< /Note (edited) >>\nendobj\n")
            fh.write(b"trailer\n<< /Root 1 0 R >>\n%%EOF\n")

    return str(path)


__all__ = ["default_extracted", "write_cert_pdf"]
