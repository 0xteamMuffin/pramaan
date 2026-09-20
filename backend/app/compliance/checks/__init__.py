"""Import every check module so CHECK_REGISTRY fills on package import.

Import side-effects call `register(...)`. Import order is irrelevant.
"""
from __future__ import annotations

from app.compliance.checks import (  # noqa: F401
    bis,
    cartel,
    debarment,
    digilocker,
    doc_integrity,
    epfo,
    esic,
    experience,
    gst,
    mca,
    mii,
    name_reconcile,
    nsic,
    oem,
    pan,
    startup,
    turnover,
    udyam,
)

__all__ = [
    "pan", "gst", "udyam", "mca", "mii", "epfo", "esic", "nsic", "bis",
    "startup", "oem", "digilocker", "debarment", "turnover", "name_reconcile",
    "experience", "cartel", "doc_integrity",
]
