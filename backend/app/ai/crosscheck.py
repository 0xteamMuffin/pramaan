"""Cross-verification: the inconsistency detector.

Using PAN as the universal join key (PAN is embedded in GSTIN chars 3-12 and is
present on PAN card / Udyam / MCA), reconcile identity, name, constitution and
dates across every available source. Findings are written to
`ctx.ai["crosscheck"]` so the deterministic `pan` and `name_reconcile` checks can
turn them into vetoes / warnings. Also returns name_reconcile-style CheckOutputs.

Spec: docs/03-architecture/ai-verification-engine.md §2.
"""
from __future__ import annotations

from typing import Any

from app.compliance import rules
from app.compliance.base import CheckContext, CheckOutput, EvidenceItem
from app.models.enums import Dimension, Verdict


def _doc_by_type(ctx: CheckContext, *keywords: str) -> Any | None:
    for doc in ctx.documents or []:
        dt = str(getattr(doc, "doc_type", "") or "").lower()
        if any(kw in dt for kw in keywords):
            return doc
    return None


def _doc_field(ctx: CheckContext, keywords: tuple[str, ...], *fields: str) -> Any:
    doc = _doc_by_type(ctx, *keywords)
    if doc is None:
        return None
    return rules.first(dict(getattr(doc, "extracted", None) or {}), *fields)


def _collect_pan_sources(ctx: CheckContext) -> dict[str, str]:
    sources: dict[str, str] = {}
    declared = ctx.identifiers.get("pan") or getattr(ctx.bidder, "primary_pan", None)
    if declared:
        sources["declared"] = declared.strip().upper()

    embedded = rules.pan_from_gstin(ctx.identifiers.get("gstin"))
    if embedded:
        sources["gstin_embedded"] = embedded

    pan_card = _doc_field(ctx, ("pan",), "pan", "pan_no", "permanent_account_number")
    if pan_card:
        sources["pan_card"] = str(pan_card).strip().upper()

    udyam_pan = rules.first(rules.portal_data(ctx, "udyam"), "pan") or _doc_field(
        ctx, ("udyam",), "pan"
    )
    if udyam_pan:
        sources["udyam"] = str(udyam_pan).strip().upper()

    mca_pan = rules.first(rules.portal_data(ctx, "mca"), "pan") or _doc_field(
        ctx, ("mca", "coi", "incorp"), "pan"
    )
    if mca_pan:
        sources["mca"] = str(mca_pan).strip().upper()

    gst_pan = rules.first(rules.portal_data(ctx, "gst"), "pan")
    if gst_pan:
        sources["gst_portal"] = str(gst_pan).strip().upper()

    return sources


def _collect_name_sources(ctx: CheckContext) -> dict[str, str]:
    sources: dict[str, str] = {}
    if getattr(ctx.bidder, "legal_name", None):
        sources["declared_legal"] = ctx.bidder.legal_name
    if getattr(ctx.bidder, "trade_name", None):
        sources["declared_trade"] = ctx.bidder.trade_name

    pan_name = rules.first(rules.portal_data(ctx, "pan"), "name", "holder_name") or _doc_field(
        ctx, ("pan",), "name", "holder_name"
    )
    if pan_name:
        sources["pan"] = str(pan_name)

    gst_name = rules.first(
        rules.portal_data(ctx, "gst"), "legal_name", "trade_name", "name"
    )
    if gst_name:
        sources["gst"] = str(gst_name)

    udyam_name = rules.first(
        rules.portal_data(ctx, "udyam"), "enterprise_name", "name"
    ) or _doc_field(ctx, ("udyam",), "enterprise_name", "name")
    if udyam_name:
        sources["udyam"] = str(udyam_name)

    mca_name = rules.first(
        rules.portal_data(ctx, "mca"), "company_name", "name"
    ) or _doc_field(ctx, ("mca", "coi", "incorp"), "company_name", "name")
    if mca_name:
        sources["mca"] = str(mca_name)

    return sources


def _reconcile_pan(ctx: CheckContext) -> dict[str, Any]:
    sources = _collect_pan_sources(ctx)
    distinct = {v for v in sources.values() if v}
    reference = sources.get("declared") or (next(iter(distinct)) if distinct else None)
    mismatch = len(distinct) > 1
    detail = ""
    if mismatch:
        pairs = ", ".join(f"{k}={v}" for k, v in sources.items())
        detail = f"PAN differs across sources ({pairs})"
    return {
        "sources": sources,
        "distinct": sorted(distinct),
        "reference": reference,
        "mismatch": mismatch,
        "detail": detail,
    }


def _reconcile_name(ctx: CheckContext) -> dict[str, Any]:
    sources = _collect_name_sources(ctx)
    base = sources.get("declared_legal") or sources.get("declared_trade")
    pairwise: list[dict[str, Any]] = []
    min_score = 100.0
    worst: tuple[str, str] | None = None
    if base:
        for label, value in sources.items():
            if label.startswith("declared"):
                continue
            score = rules.name_similarity(base, value)
            pairwise.append({"source": label, "name": value, "score": round(score, 1)})
            if score < min_score:
                min_score = score
                worst = (label, value)
    mismatch = bool(pairwise) and min_score < rules.NAME_MATCH_THRESHOLD
    detail = ""
    if mismatch and worst:
        detail = (
            f"Name on {worst[0]} ('{worst[1]}') differs from declared "
            f"'{base}' (similarity {min_score:.0f}%)"
        )
    return {
        "declared": base,
        "sources": sources,
        "pairwise": pairwise,
        "min_score": round(min_score, 1) if pairwise else None,
        "mismatch": mismatch,
        "detail": detail,
    }


def _reconcile_constitution(ctx: CheckContext) -> dict[str, Any]:
    constitution = getattr(ctx.bidder, "constitution", None)
    pan = ctx.identifiers.get("pan") or getattr(ctx.bidder, "primary_pan", None)
    expected = rules.constitution_expected_pan_char(constitution)
    actual = rules.pan_holder_char(pan)
    mismatch = bool(expected and actual and expected != actual)
    detail = ""
    if mismatch:
        detail = (
            f"Declared constitution '{constitution}' expects PAN 4th char "
            f"'{expected}' ({rules.PAN_HOLDER_TYPES.get(expected, '?')}) but PAN "
            f"carries '{actual}' ({rules.PAN_HOLDER_TYPES.get(actual, '?')})"
        )
    return {
        "declared": constitution,
        "expected_char": expected,
        "actual_char": actual,
        "mismatch": mismatch,
        "detail": detail,
    }


def _reconcile_expiry(ctx: CheckContext) -> list[dict[str, Any]]:
    as_of = None
    submitted = getattr(getattr(ctx, "bid", None), "submitted_at", None)
    if submitted is not None:
        as_of = rules.parse_date(submitted)
    issues: list[dict[str, Any]] = []
    for doc in ctx.documents or []:
        extracted = dict(getattr(doc, "extracted", None) or {})
        valid_till = rules.first(
            extracted, "valid_till", "valid_upto", "expiry", "expiry_date", "valid_until"
        )
        if valid_till is None:
            continue
        expired = rules.is_expired(valid_till, as_of=as_of)
        if expired:
            issues.append(
                {
                    "document_id": getattr(doc, "id", None),
                    "doc_type": getattr(doc, "doc_type", None),
                    "valid_till": str(valid_till),
                    "expired": True,
                }
            )
    return issues


def crosscheck(ctx: CheckContext) -> list[CheckOutput]:
    """Populate ctx.ai['crosscheck'] and return name_reconcile-style outputs."""
    pan = _reconcile_pan(ctx)
    name = _reconcile_name(ctx)
    constitution = _reconcile_constitution(ctx)
    expiry = _reconcile_expiry(ctx)

    findings: list[dict[str, Any]] = []
    if pan["mismatch"]:
        findings.append({"kind": "pan_mismatch", "detail": pan["detail"]})
    if name["mismatch"]:
        findings.append({"kind": "name_mismatch", "detail": name["detail"]})
    if constitution["mismatch"]:
        findings.append({"kind": "constitution_mismatch", "detail": constitution["detail"]})
    for e in expiry:
        findings.append({"kind": "expired_document", "detail": f"{e['doc_type']} expired {e['valid_till']}"})

    ctx.ai["crosscheck"] = {
        "pan": pan,
        "name": name,
        "constitution": constitution,
        "expiry": expiry,
        "findings": findings,
    }

    # ---- name_reconcile-style output (advisory; the registered check mirrors it) ----
    evidence = [
        EvidenceItem(
            kind="rule",
            label="Name reconciliation across portals/documents",
            source="crosscheck",
            method="fuzzy-token-set",
            payload={"pairwise": name["pairwise"], "min_score": name["min_score"]},
        )
    ]
    if name["mismatch"] or constitution["mismatch"]:
        verdict = Verdict.WARN.value
        summary = "; ".join(d for d in (name["detail"], constitution["detail"]) if d)
    elif name["pairwise"]:
        verdict = Verdict.PASS.value
        summary = "Names consistent across sources"
    else:
        verdict = Verdict.UNVERIFIABLE.value
        summary = "No corroborating name sources available"

    out = CheckOutput(
        check_key="name_reconcile",
        dimension=Dimension.IDENTITY.value,
        verdict=verdict,
        summary=summary,
        is_veto=False,
        data={"name": name, "constitution": constitution},
        source="crosscheck",
        method="fuzzy-token-set",
        mode="SIMULATED",
        evidence=evidence,
    )
    return [out]
