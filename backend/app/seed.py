"""Deterministic synthetic-data seeder.

    python -m app.seed            # seed (idempotent-ish; safe on a fresh DB)
    python -m app.seed --reset    # drop + recreate all tables, then seed

Seeds demo users, 3 tenders + rules, the 9-bidder fraud cast, their documents,
bids, government mock fixtures (data/fixtures/gov/**), and the debarment snapshot
(data/blacklists/**). With an empty .env the engine then reproduces the golden
outcomes in docs/05-data/dummy-dataset-spec.md §8.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure the repo root is importable so `data.generators.*` resolves.
from app.core.config import REPO_ROOT

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.core.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    Bid,
    Bidder,
    DebarmentRecord,
    Document,
    Identifier,
    Tender,
    TenderRequirement,
    User,
)
from app.providers.registry import fixture_gov_dir  # noqa: E402
from app.services import audit  # noqa: E402
from data.generators import gen_bidders, gen_documents  # noqa: E402
from data.generators.gen_tenders import TENDERS  # noqa: E402

DOCS_DIR = REPO_ROOT / "data" / "fixtures" / "docs"
BLACKLIST_DIR = REPO_ROOT / "data" / "blacklists"

DEMO_USERS = [
    ("officer@pramaan.gov.in", "Priya Menon", "OFFICER"),
    ("analyst@pramaan.gov.in", "Rajesh Kumar", "ANALYST"),
    ("auditor@pramaan.gov.in", "Anita Rao", "AUDITOR"),
    ("admin@pramaan.gov.in", "System Admin", "ADMIN"),
]
DEMO_PASSWORD = "pramaan123"

# Identifier-kind mapping (idmap key -> Identifier.kind enum value)
_KIND = {
    "pan": "PAN", "gstin": "GSTIN", "cin": "CIN", "udyam": "UDYAM", "din": "DIN",
    "epfo": "EPFO", "esic": "ESIC", "dpiit": "DPIIT", "bis": "BIS",
}
# Which check's fixture is keyed by which identifier
_FIXTURE_ID = {
    "pan": "pan", "gst": "gstin", "udyam": "udyam", "mca": "cin",
    "bis": "bis", "epfo": "epfo", "esic": "esic", "startup": "dpiit",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _sanitize(ident: str) -> str:
    return str(ident).replace("/", "_").replace("\\", "_")


# --------------------------------------------------------------------------- #
# Government mock fixtures
# --------------------------------------------------------------------------- #
def _default_gov_payload(check: str, b: dict) -> dict:
    idmap = b["identifiers"]
    name = b["legal_name"]
    if check == "pan":
        holder = b["declared_pan"][3] if len(b["declared_pan"]) >= 4 else "C"
        return {"pan": b["declared_pan"], "name": name, "status": "Active", "valid": True,
                "category": holder, "aadhaar_seeded": True}
    if check == "gst":
        return {"gstin": idmap.get("gstin"), "legal_name": name, "trade_name": b.get("trade_name"),
                "name": name, "pan": b["gstin_pan"], "status": "Active", "taxpayer_type": "Regular",
                "registration_date": "2018-07-01", "returns_filed": 12,
                "returns": [{"period": f"2025-{m:02d}", "type": "GSTR-3B", "filed": True} for m in range(1, 13)]}
    if check == "udyam":
        return {"udyam_no": idmap.get("udyam"), "enterprise_name": name, "name": name,
                "enterprise_type": b["flags"].get("mse_class", "Small"), "status": "Active",
                "pan": b["declared_pan"], "nic": ["28120"]}
    if check == "mca":
        yr = b.get("cin_year") or 2015
        return {"cin": idmap.get("cin"), "company_name": name, "name": name, "status": "Active",
                "incorporation_date": f"01/04/{yr}", "incorporation_year": yr,
                "pan": b["declared_pan"], "directors": [{"din": idmap.get("din"), "name": f"Director {b['code']}"}]}
    if check == "bis":
        return {"bis": idmap.get("bis"), "license_holder": name, "brand": b["flags"].get("quoted_brand"),
                "status": "Active", "scheme": b.get("bis_scheme", "ISI")}
    if check == "epfo":
        return {"epfo": idmap.get("epfo"), "establishment_name": name, "status": "Active"}
    if check == "esic":
        return {"esic": idmap.get("esic"), "employer_name": name, "status": "Active"}
    if check == "startup":
        return {"dpiit": idmap.get("dpiit"), "entity_name": name, "status": "Recognized",
                "recognition_status": "Active"}
    return {}


def _write_gov_fixtures(b: dict) -> int:
    idmap = b["identifiers"]
    written = 0
    for check, id_key in _FIXTURE_ID.items():
        ident = idmap.get(id_key)
        if not ident:
            continue
        payload = _default_gov_payload(check, b)
        payload.update(b.get("gov", {}).get(check, {}))
        out = fixture_gov_dir() / check / f"{_sanitize(ident)}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        written += 1
    return written


# --------------------------------------------------------------------------- #
# Debarment snapshot (World Bank + CPPP style) — includes B9's director DIN
# --------------------------------------------------------------------------- #
def _build_debarment(resolved: list[dict]) -> list[dict]:
    records: list[dict] = [
        {"source": "worldbank", "entity_name": "Blackline Global Traders Pvt Ltd",
         "pan": "AAcCB1234K".upper(), "cin": None, "din": None,
         "grounds": "Fraudulent practice (World Bank cross-debarment)",
         "from_date": "2024-05-01", "to_date": "2027-04-30", "captured_at": "2026-08-01"},
        {"source": "cppp", "entity_name": "Sunrise Infra Projects",
         "pan": None, "cin": None, "din": "50011223",
         "grounds": "Submission of forged experience certificate; debarred 3 years",
         "from_date": "2025-01-15", "to_date": "2028-01-14", "captured_at": "2026-08-01"},
        {"source": "cppp", "entity_name": "Orbit Engineering Works",
         "pan": None, "cin": None, "din": "60099887",
         "grounds": "Breach of contract; banned by procuring ministry",
         "from_date": "2023-11-01", "to_date": "2026-10-31", "captured_at": "2026-08-01"},
    ]
    # Plant B9's director DIN into the snapshot.
    for b in resolved:
        if b.get("debarred_din"):
            records.append({
                "source": "cppp", "entity_name": b["legal_name"],
                "pan": b["declared_pan"], "cin": b["identifiers"].get("cin"),
                "din": b["identifiers"].get("din"),
                "grounds": "Debarred for misrepresentation in a GeM tender (2 years)",
                "from_date": "2025-06-01", "to_date": "2027-05-31", "captured_at": "2026-08-01",
            })
    return records


# --------------------------------------------------------------------------- #
# Seeder
# --------------------------------------------------------------------------- #
def seed(reset: bool = False) -> dict:
    if reset:
        Base.metadata.drop_all(bind=engine)
    init_db()

    db = SessionLocal()
    counts = {"users": 0, "tenders": 0, "requirements": 0, "bidders": 0,
              "identifiers": 0, "documents": 0, "bids": 0, "debarment": 0, "gov_fixtures": 0}
    try:
        # ---- users ----
        for email, name, role in DEMO_USERS:
            if db.query(User).filter_by(email=email).first():
                continue
            pw, salt = hash_password(DEMO_PASSWORD)
            db.add(User(email=email, name=name, role=role, password_hash=pw, salt=salt))
            counts["users"] += 1
        db.commit()

        # ---- tenders + requirements ----
        tender_by_code: dict[str, Tender] = {}
        for t in TENDERS:
            tender = db.query(Tender).filter_by(ref_no=t["ref_no"]).first()
            if tender is None:
                tender = Tender(
                    ref_no=t["ref_no"], title=t["title"], buyer_org=t["buyer_org"],
                    category=t["category"], estimated_value=t["estimated_value"],
                    template_id=t.get("template_id"), status=t.get("status", "open"),
                )
                db.add(tender)
                db.flush()
                for check_key, mandatory, params in t["requirements"]:
                    db.add(TenderRequirement(tender_id=tender.id, check_key=check_key,
                                             mandatory=mandatory, params=params))
                    counts["requirements"] += 1
                counts["tenders"] += 1
            tender_by_code[t["code"]] = tender
        db.commit()

        # ---- bidders / identifiers / documents / bids + gov fixtures ----
        resolved = gen_bidders.resolve_cast()
        for b in resolved:
            if db.query(Bidder).filter_by(legal_name=b["legal_name"]).first():
                continue
            bidder = Bidder(
                legal_name=b["legal_name"], trade_name=b.get("trade_name"),
                constitution=b["constitution"], claimed_flags=b["flags"],
                primary_pan=b["declared_pan"], contact=b["contact"],
            )
            db.add(bidder)
            db.flush()
            counts["bidders"] += 1

            for id_key, value in b["identifiers"].items():
                kind = _KIND.get(id_key)
                if not kind or not value:
                    continue
                db.add(Identifier(bidder_id=bidder.id, kind=kind, value=value,
                                  format_valid=True, source="declared"))
                counts["identifiers"] += 1

            for doc_type, overrides in b["docs"]:
                extracted = gen_documents.default_extracted(doc_type, b, overrides)
                pdf_path = DOCS_DIR / b["code"] / f"{doc_type}.pdf"
                gen_documents.write_cert_pdf(pdf_path, doc_type, b, extracted)
                file_hash = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
                db.add(Document(
                    bidder_id=bidder.id, doc_type=doc_type, storage_uri=str(pdf_path),
                    file_hash=file_hash, source="uploaded", extracted=extracted,
                ))
                counts["documents"] += 1

            tender = tender_by_code[b["tender"]]
            db.add(Bid(
                tender_id=tender.id, bidder_id=bidder.id, quoted_value=b.get("quoted_value"),
                submission_meta={"ip": b.get("ip"), "session": b["code"], "device": "web"},
            ))
            counts["bids"] += 1

            counts["gov_fixtures"] += _write_gov_fixtures(b)
        db.commit()

        # ---- debarment snapshot (file + DB) ----
        records = _build_debarment(resolved)
        BLACKLIST_DIR.mkdir(parents=True, exist_ok=True)
        (BLACKLIST_DIR / "debarment_snapshot.json").write_text(
            json.dumps(records, indent=2), encoding="utf-8"
        )
        for r in records:
            if db.query(DebarmentRecord).filter_by(
                entity_name=r["entity_name"], source=r["source"]
            ).first():
                continue
            db.add(DebarmentRecord(**r))
            counts["debarment"] += 1
        db.commit()

        # ---- pre-run verification for every bid so the DB is demo-ready ----
        from app.compliance import engine as comp_engine  # lazy; avoid shadowing DB engine

        counts["runs"] = 0
        for bid in db.query(Bid).all():
            try:
                comp_engine.run_verification(db, bid.id)
                counts["runs"] += 1
            except Exception as exc:  # noqa: BLE001
                print(f"  ! verification failed for bid {bid.id}: {exc}")

        audit.record(db, action="seed.completed", target="dataset",
                     payload={k: v for k, v in counts.items()})
        return counts
    finally:
        db.close()


def main() -> None:
    reset = "--reset" in sys.argv
    counts = seed(reset=reset)
    print("PRAMAAN seed complete" + (" (reset)" if reset else "") + ":")
    for k, v in counts.items():
        print(f"  {k:14s}: {v}")


if __name__ == "__main__":
    main()
