"""Deterministic, explainable scoring.

Spec: docs/03-architecture/compliance-engine.md §2-4.

    dimension_score = Σ(credit × weight) / Σ(applicable weight)      # 0..1
    overall_raw     = Σ(dimension_score × dim_weight) / Σ(dim_weight present)
    overall_score   = round(overall_raw × 100)                       # 0..100

UNVERIFIABLE / NOT_APPLICABLE are excluded from denominators (never penalize a
bidder for a portal being down). Any veto caps the score into the HIGH band.
"""
from __future__ import annotations

from typing import Any, Iterable

from app.compliance.base import (
    BAND_LOW_MIN,
    BAND_MEDIUM_MIN,
    DIMENSION_WEIGHTS,
    VERDICT_CREDIT,
    VETO_SCORE_CAP,
    CheckOutput,
)
from app.models.enums import RiskBand, Verdict

# Verdicts that participate in the denominator
_SCORED = {Verdict.PASS.value, Verdict.WARN.value, Verdict.FAIL.value}


def _band_for_score(score: float) -> str:
    if score >= BAND_LOW_MIN:
        return RiskBand.LOW.value
    if score >= BAND_MEDIUM_MIN:
        return RiskBand.MEDIUM.value
    return RiskBand.HIGH.value


def _weight_map(requirements: Iterable[Any] | None) -> dict[str, float]:
    """check_key -> per-check weight (requirement.weight_override or 1.0)."""
    wm: dict[str, float] = {}
    for req in requirements or []:
        key = getattr(req, "check_key", None)
        if not key:
            continue
        override = getattr(req, "weight_override", None)
        wm[key] = float(override) if override else 1.0
    return wm


def score_run(
    check_outputs: list[CheckOutput],
    requirements: Iterable[Any] | None = None,
) -> dict[str, Any]:
    """Compute {score, band, dimension_scores, vetoes, reasons_top}."""
    weight_map = _weight_map(requirements)

    # group outputs by dimension
    by_dim: dict[str, list[CheckOutput]] = {}
    for out in check_outputs:
        by_dim.setdefault(out.dimension, []).append(out)

    dimension_scores: dict[str, dict[str, Any]] = {}
    weighted_num = 0.0
    weighted_den = 0.0

    for dim, dim_weight in DIMENSION_WEIGHTS.items():
        outs = by_dim.get(dim, [])
        num = 0.0
        den = 0.0
        checks_detail: list[dict[str, Any]] = []
        for out in outs:
            w = weight_map.get(out.check_key, 1.0)
            credit = VERDICT_CREDIT.get(out.verdict)
            scored = out.verdict in _SCORED
            if scored:
                num += (credit or 0.0) * w
                den += w
            checks_detail.append(
                {
                    "key": out.check_key,
                    "verdict": out.verdict,
                    "credit": credit if scored else None,
                    "weight": w,
                    "is_veto": out.is_veto,
                    "summary": out.summary,
                }
            )
        dim_score = (num / den) if den > 0 else None
        dimension_scores[dim] = {
            "weight": dim_weight,
            "score": round(dim_score, 4) if dim_score is not None else None,
            "checks": checks_detail,
        }
        if dim_score is not None:
            weighted_num += dim_score * dim_weight
            weighted_den += dim_weight

    overall_raw = (weighted_num / weighted_den) if weighted_den > 0 else 0.0
    score = round(overall_raw * 100)

    # ---- vetoes ----
    vetoes: list[dict[str, Any]] = []
    for out in check_outputs:
        if out.is_veto and out.verdict == Verdict.FAIL.value:
            vetoes.append(
                {
                    "key": out.check_key,
                    "dimension": out.dimension,
                    "why": out.summary,
                    "source": out.source,
                    "method": out.method,
                    "mode": out.mode,
                }
            )

    if vetoes:
        score = min(score, VETO_SCORE_CAP)

    band = _band_for_score(score)
    if vetoes:
        band = RiskBand.HIGH.value

    # ---- top reasons (vetoes -> fails -> warns -> unverifiable-critical) ----
    reasons_top: list[str] = []
    for v in vetoes:
        reasons_top.append(f"VETO: {v['why'] or v['key']}")
    for out in check_outputs:
        if out.is_veto:
            continue
        if out.verdict == Verdict.FAIL.value:
            reasons_top.append(f"FAIL: {out.summary or out.check_key}")
    for out in check_outputs:
        if out.verdict == Verdict.WARN.value:
            reasons_top.append(f"WARN: {out.summary or out.check_key}")
    for out in check_outputs:
        if out.verdict == Verdict.UNVERIFIABLE.value:
            reasons_top.append(f"UNVERIFIABLE: {out.summary or out.check_key}")

    return {
        "score": score,
        "band": band,
        "dimension_scores": dimension_scores,
        "vetoes": vetoes,
        "reasons_top": reasons_top[:8],
    }
