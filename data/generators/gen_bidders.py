"""The 9-bidder synthetic cast with planted frauds (docs/05-data/dummy-dataset-spec.md §4).

`CAST` is a concise declarative spec. `resolve_cast()` turns it into fully-resolved
bidder records (concrete format-valid identifiers via gen_ids), which seed.py loads
into the DB and uses to emit deterministic government mock fixtures.

Every planted fraud maps to a specific engine detector:
  B1 clean            -> LOW
  B2 micro+turnover mismatch, udyam name != legal, thin experience -> MEDIUM
  B3 forged OEM MAF + BIS licence of another brand                 -> HIGH (vetoes)
  B4 PAN-on-GST != PAN-on-Udyam + GST cancelled                    -> HIGH (vetoes)
  B5 CIN year 2025 vs 5y experience claim + no EPFO/ESIC (shell)   -> HIGH (veto)
  B6/B7 shared director DIN + bank + submission IP (cartel)        -> HIGH (veto)
  B8 startup exemption on resold item + Class-II LC not >20%       -> MEDIUM
  B9 director DIN matches debarment snapshot                       -> HIGH (veto)
"""
from __future__ import annotations

from typing import Any

from data.generators import gen_ids as ids

# Shared attributes used to plant the B6/B7 cartel ring.
CARTEL_DIN = "48217731"
CARTEL_BANK = "HDFC0000123-50200099887766"
CARTEL_IP = "103.219.44.17"

# --------------------------------------------------------------------------- #
# Declarative cast
# --------------------------------------------------------------------------- #
CAST: list[dict[str, Any]] = [
    {
        "code": "B1",
        "legal_name": "Aarav Pumps Private Limited",
        "trade_name": "Aarav Pumps",
        "constitution": "Private Limited",
        "tender": "T1",
        "state": "TN",
        "company": True,
        "cin_year": 2011,
        "quoted_value": 30_500_000,
        "ip": "49.207.10.11",
        "identifiers": ["pan", "gstin", "cin", "udyam", "bis_isi", "din"],
        "flags": {
            "mse_class": "Small",
            "turnover": [52_000_000, 58_000_000, 61_000_000],
            "experience_years": 12,
            "mii_class": "I",
            "local_content_pct": 62,
            "quoted_brand": "Aarav",
        },
        "contact": {"address": "12 Anna Salai, Chennai", "email": "bids@aaravpumps.in",
                    "phone": "9840011111", "bank": "SBIN0000456-30011122334"},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("oem_maf", {"brand": "Aarav", "valid_till": "2028-03-31"}),
            ("bis_certificate", {}),
            ("turnover_certificate", {"turnover": [52_000_000, 58_000_000, 61_000_000]}),
        ],
        "gov": {},  # all defaults -> clean
    },
    {
        "code": "B2",
        "legal_name": "Bharat Micro Traders",
        "trade_name": "Bharat Micro Traders",
        "constitution": "Proprietorship",
        "tender": "T1",
        "state": "TN",
        "company": False,
        "quoted_value": 28_900_000,
        "ip": "182.71.22.9",
        "identifiers": ["pan", "gstin", "udyam"],
        "flags": {
            "mse_class": "Micro",                       # claims Micro ...
            "turnover": [80_000_000, 86_000_000, 91_000_000],  # ... but turnover >> ₹5 cr ceiling
            "experience_years": 2,                       # below T1 min 3y -> non-veto FAIL
            "mii_class": "I",
            "local_content_pct": 55,
            "quoted_brand": "Bharat",
        },
        "contact": {"address": "88 GST Road, Tambaram, Chennai", "email": "info@bharatmicro.in",
                    "phone": "9841022222", "bank": "ICIC0000789-60022233445"},
        "docs": [
            ("udyam_certificate", {"enterprise_type": "Micro"}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("turnover_certificate", {"turnover": [80_000_000, 86_000_000, 91_000_000]}),
        ],
        # Udyam name deliberately differs from legal name -> name_reconcile WARN
        "gov": {"udyam": {"enterprise_name": "Meenakshi Enterprises", "enterprise_type": "Micro"}},
    },
    {
        "code": "B3",
        "legal_name": "Chola Infra LLP",
        "trade_name": "Chola Infra",
        "constitution": "LLP",
        "tender": "T1",
        "state": "TN",
        "company": True,
        "cin_year": 2016,
        "quoted_value": 31_200_000,
        "ip": "115.99.180.4",
        "identifiers": ["pan", "gstin", "cin", "udyam", "bis_isi", "din"],
        "flags": {
            "mse_class": "Small",
            "turnover": [40_000_000, 44_000_000, 47_000_000],
            "experience_years": 8,
            "mii_class": "I",
            "local_content_pct": 58,
            "quoted_brand": "Kirloskar",   # reseller quoting Kirloskar
            "reseller": True,
        },
        "contact": {"address": "5 Mount Road, Chennai", "email": "tenders@cholainfra.in",
                    "phone": "9842033333", "bank": "AXIS0000321-70033344556"},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            # forged MAF: tampered + brand mismatch handled via forensics veto
            ("oem_maf", {"brand": "Kirloskar", "valid_till": "2027-06-30",
                          "_tamper": True,
                          "_tamper_reason": "MAF edited after signing (PDF incremental-update); pasted OEM seal"}),
            ("bis_certificate", {}),
            ("turnover_certificate", {"turnover": [40_000_000, 44_000_000, 47_000_000]}),
        ],
        # BIS licence actually registered to a different brand (Grundfos)
        "gov": {"bis": {"license_holder": "Grundfos Pumps India Ltd", "brand": "Grundfos"}},
    },
    {
        "code": "B4",
        "legal_name": "Deccan Supplies",
        "trade_name": "Deccan Supplies",
        "constitution": "Partnership",
        "tender": "T1",
        "state": "TG",
        "company": False,
        "quoted_value": 29_700_000,
        "ip": "117.198.5.66",
        "identifiers": ["pan", "gstin", "udyam", "din"],
        "gstin_wrong_pan": True,     # GSTIN embeds a DIFFERENT PAN than declared -> mismatch
        "flags": {
            "mse_class": "Small",
            "turnover": [30_000_000, 33_000_000, 36_000_000],
            "experience_years": 6,
            "mii_class": "I",
            "local_content_pct": 60,
            "quoted_brand": "Deccan",
        },
        "contact": {"address": "22 Banjara Hills, Hyderabad", "email": "sales@deccansupplies.in",
                    "phone": "9843044444", "bank": "HDFC0000654-80044455667"},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("turnover_certificate", {"turnover": [30_000_000, 33_000_000, 36_000_000]}),
        ],
        # GST cancelled (veto). PAN mismatch is created via gstin_wrong_pan +
        # gst-portal PAN = the wrong PAN, while Udyam carries the declared PAN.
        "gov": {"gst": {"status": "Cancelled"}},
    },
    {
        "code": "B5",
        "legal_name": "Everest Enterprises Private Limited",
        "trade_name": "Everest Enterprises",
        "constitution": "Private Limited",
        "tender": "T1",
        "state": "DL",
        "company": True,
        "cin_year": 2025,            # incorporated 2025 ...
        "quoted_value": 27_400_000,
        "ip": "106.51.72.30",
        "identifiers": ["pan", "gstin", "cin", "udyam", "din"],  # NO epfo/esic -> shell signal
        "flags": {
            "mse_class": "Small",
            "turnover": [45_000_000, 48_000_000, 52_000_000],
            "experience_years": 5,   # ... but claims 5y experience -> vintage conflict
            "mii_class": "I",
            "local_content_pct": 55,
            "quoted_brand": "Everest",
        },
        "contact": {"address": "9 Nehru Place, New Delhi", "email": "contact@everestent.in",
                    "phone": "9844055555", "bank": "PUNB0000987-90055566778"},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("oem_maf", {"brand": "Everest", "valid_till": "2028-01-31"}),
            ("bis_certificate", {}),
            ("turnover_certificate", {"turnover": [45_000_000, 48_000_000, 52_000_000]}),
        ],
        "gov": {"mca": {"incorporation_year": 2025}},
    },
    {
        "code": "B6",
        "legal_name": "Falcon Services Private Limited",
        "trade_name": "Falcon Services",
        "constitution": "Private Limited",
        "tender": "T2",
        "state": "TN",
        "company": True,
        "cin_year": 2014,
        "quoted_value": 10_480_000,   # near-identical to B7
        "ip": CARTEL_IP,               # shared submission IP
        "shared_din": CARTEL_DIN,      # shared director
        "shared_bank": CARTEL_BANK,    # shared bank account
        "identifiers": ["pan", "gstin", "cin", "udyam", "epfo", "esic", "din"],
        "flags": {
            "mse_class": "Small",
            "turnover": [12_000_000, 13_500_000, 14_000_000],
            "experience_years": 7,
        },
        "contact": {"address": "3 Industrial Estate, Guindy, Chennai", "email": "ops@falconservices.in",
                    "phone": "9845066666", "bank": CARTEL_BANK},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("epfo_certificate", {}),
            ("esic_certificate", {}),
            ("turnover_certificate", {"turnover": [12_000_000, 13_500_000, 14_000_000]}),
        ],
        "gov": {},
    },
    {
        "code": "B7",
        "legal_name": "Garuda Facilities Private Limited",
        "trade_name": "Garuda Facilities",
        "constitution": "Private Limited",
        "tender": "T2",
        "state": "TN",
        "company": True,
        "cin_year": 2015,
        "quoted_value": 10_510_000,   # near-identical to B6
        "ip": CARTEL_IP,               # shared submission IP
        "shared_din": CARTEL_DIN,      # shared director
        "shared_bank": CARTEL_BANK,    # shared bank account
        "identifiers": ["pan", "gstin", "cin", "udyam", "epfo", "esic", "din"],
        "flags": {
            "mse_class": "Small",
            "turnover": [11_500_000, 12_800_000, 13_900_000],
            "experience_years": 6,
        },
        "contact": {"address": "3 Industrial Estate, Guindy, Chennai", "email": "bids@garudafacilities.in",
                    "phone": "9846077777", "bank": CARTEL_BANK},
        "docs": [
            ("udyam_certificate", {}),
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("epfo_certificate", {}),
            ("esic_certificate", {}),
            ("turnover_certificate", {"turnover": [11_500_000, 12_800_000, 13_900_000]}),
        ],
        "gov": {},
    },
    {
        "code": "B8",
        "legal_name": "Hind Startup Labs Private Limited",
        "trade_name": "Hind Startup Labs",
        "constitution": "Private Limited",
        "tender": "T3",
        "state": "KA",
        "company": True,
        "cin_year": 2021,
        "quoted_value": 5_600_000,
        "ip": "14.139.60.5",
        "identifiers": ["pan", "gstin", "cin", "dpiit", "bis_crs", "din"],
        "flags": {
            "startup_exemption": True,
            "resold": True,                 # exemption on a resold/non-innovative item -> WARN
            "item_type": "resold",
            "mii_class": "II",
            "local_content_pct": 20,        # Class-II requires >20% -> non-veto FAIL
            "quoted_brand": "Hind",
            "experience_years": 3,
        },
        "contact": {"address": "40 Koramangala, Bengaluru", "email": "gov@hindstartup.in",
                    "phone": "9847088888", "bank": "KKBK0000111-11122233344"},
        "docs": [
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("startup_certificate", {}),
            ("bis_certificate", {}),
        ],
        "gov": {},
    },
    {
        "code": "B9",
        "legal_name": "Indus Corp Private Limited",
        "trade_name": "Indus Corp",
        "constitution": "Private Limited",
        "tender": "T3",
        "state": "MH",
        "company": True,
        "cin_year": 2013,
        "quoted_value": 5_450_000,
        "ip": "202.54.12.88",
        "debarred_din": True,               # this director DIN is in the debarment snapshot
        "identifiers": ["pan", "gstin", "cin", "bis_crs", "din"],
        "flags": {
            "mii_class": "II",
            "local_content_pct": 35,
            "quoted_brand": "Indus",
            "experience_years": 9,
        },
        "contact": {"address": "7 Andheri East, Mumbai", "email": "tenders@induscorp.in",
                    "phone": "9848099999", "bank": "UTIB0000222-22233344455"},
        "docs": [
            ("gst_certificate", {}),
            ("pan_card", {}),
            ("bis_certificate", {}),
        ],
        "gov": {},
    },
]


# --------------------------------------------------------------------------- #
# Resolution: concrete identifiers per bidder
# --------------------------------------------------------------------------- #
def _bis_scheme_for(tender: str) -> str:
    return "CRS" if tender == "T3" else "ISI"


def resolve_cast() -> list[dict[str, Any]]:
    """Return fully-resolved bidder records with concrete identifiers."""
    resolved: list[dict[str, Any]] = []
    for spec in CAST:
        code = spec["code"]
        state = spec.get("state", "TN")
        constitution = spec["constitution"]
        name_initial = spec["legal_name"][0]

        pan = ids.pan_for_constitution(code, constitution, name_initial=name_initial)
        # B4: GSTIN embeds a different PAN than declared -> cross-portal mismatch
        gstin_pan = pan
        wrong_pan = None
        if spec.get("gstin_wrong_pan"):
            wrong_pan = ids.pan_for_constitution(code + "_alt", constitution, name_initial="Z")
            gstin_pan = wrong_pan

        want = set(spec.get("identifiers", []))
        idmap: dict[str, str] = {"pan": pan}
        if "gstin" in want:
            idmap["gstin"] = ids.make_gstin(gstin_pan, state=state, entity_no="1")
        if "cin" in want and spec.get("company"):
            idmap["cin"] = ids.make_cin(code, year=spec.get("cin_year", 2015), state=state,
                                        listed=False)
        if "udyam" in want:
            idmap["udyam"] = ids.make_udyam(code, state=state)
        if "din" in want:
            idmap["din"] = spec.get("shared_din") or ids.make_din(code)
        if "epfo" in want:
            idmap["epfo"] = ids.make_epfo(code)
        if "esic" in want:
            idmap["esic"] = ids.make_esic(code)
        if "dpiit" in want:
            idmap["dpiit"] = ids.make_dpiit(code)
        if "bis_isi" in want:
            idmap["bis"] = ids.make_bis_isi(code)
        if "bis_crs" in want:
            idmap["bis"] = ids.make_bis_crs(code)

        contact = dict(spec.get("contact", {}))
        if spec.get("shared_bank"):
            contact["bank"] = spec["shared_bank"]

        resolved.append({
            "code": code,
            "legal_name": spec["legal_name"],
            "trade_name": spec.get("trade_name"),
            "constitution": constitution,
            "tender": spec["tender"],
            "primary_pan": pan,
            "declared_pan": pan,
            "gstin_pan": gstin_pan,       # PAN embedded in GSTIN (may differ for B4)
            "identifiers": idmap,
            "flags": dict(spec.get("flags", {})),
            "contact": contact,
            "quoted_value": spec.get("quoted_value"),
            "ip": spec.get("ip"),
            "cin_year": spec.get("cin_year"),
            "docs": list(spec.get("docs", [])),
            "gov": dict(spec.get("gov", {})),
            "debarred_din": bool(spec.get("debarred_din")),
            "bis_scheme": _bis_scheme_for(spec["tender"]),
        })
    return resolved


__all__ = ["CAST", "CARTEL_DIN", "CARTEL_BANK", "CARTEL_IP", "resolve_cast"]
