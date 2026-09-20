"""The 3 demo tenders + their rule sets (rules-as-data).

Each tender lists `TenderRequirement`-shaped rows: (check_key, mandatory, params).
The compliance engine reads `params` per check (docs/03-architecture/compliance-engine.md §5).
Spec: docs/05-data/dummy-dataset-spec.md §3.
"""
from __future__ import annotations

from typing import Any

# ref_no scheme mirrors GeM bid numbers (GEM/YYYY/B/<serial>)
TENDERS: list[dict[str, Any]] = [
    {
        "code": "T1",
        "ref_no": "GEM/2026/B/0026101",
        "title": "Supply, Installation & Commissioning of Industrial Centrifugal Pumps",
        "buyer_org": "CPCL",
        "category": "goods",
        "estimated_value": 32_000_000.00,  # ~₹3.2 cr
        "template_id": "goods.mii1.oem.bis",
        "status": "open",
        "requirements": [
            ("pan", True, {}),
            ("mca", True, {}),
            ("name_reconcile", True, {"threshold": 86}),
            ("gst", True, {"require_returns": 6}),
            ("turnover", True, {"min_turnover": 20_000_000, "years": 3}),
            ("udyam", False, {}),
            ("mii", True, {"min_class": "I", "min_local_content_pct": 50}),
            ("oem", True, {"require_for": "quoted_brand"}),
            ("bis", True, {"scheme": "ISI", "product": "centrifugal pump"}),
            ("experience", True, {"min_years": 3}),
            ("debarment", True, {}),
            ("cartel", True, {}),
            ("digilocker", False, {}),
        ],
    },
    {
        "code": "T2",
        "ref_no": "GEM/2026/B/0026102",
        "title": "Comprehensive Facility Management Services (Refinery Township)",
        "buyer_org": "CPCL",
        "category": "services",
        "estimated_value": 11_000_000.00,  # ~₹1.1 cr
        "template_id": "services.labour.msepref",
        "status": "open",
        "requirements": [
            ("pan", True, {}),
            ("gst", True, {"require_returns": 12}),
            ("turnover", True, {"min_turnover": 8_000_000, "years": 3}),
            ("epfo", True, {}),
            ("esic", True, {}),
            ("udyam", False, {"mse_preference": True, "margin_pct": 15}),
            ("name_reconcile", True, {"threshold": 86}),
            ("experience", True, {"min_years": 3}),
            ("debarment", True, {}),
            ("cartel", True, {}),
        ],
    },
    {
        "code": "T3",
        "ref_no": "GEM/2026/B/0026103",
        "title": "Procurement of Desktop Computers & Networking Hardware",
        "buyer_org": "CPCL",
        "category": "goods",
        "estimated_value": 6_000_000.00,  # ~₹60 L
        "template_id": "goods.mii2.crs.startup",
        "status": "open",
        "requirements": [
            ("pan", True, {}),
            ("mca", False, {}),
            ("name_reconcile", True, {"threshold": 86}),
            ("gst", True, {"require_returns": 6}),
            ("mii", True, {"min_class": "II", "min_local_content_pct": 20}),
            ("bis", True, {"scheme": "CRS", "product": "IT hardware"}),
            ("startup", False, {"exemption_allowed": True, "scope": "manufactured_only"}),
            ("udyam", False, {"mse_preference": True, "margin_pct": 15}),
            ("debarment", True, {"strict": True}),
            ("cartel", True, {}),
        ],
    },
]


def get_tenders() -> list[dict[str, Any]]:
    return TENDERS


__all__ = ["TENDERS", "get_tenders"]
