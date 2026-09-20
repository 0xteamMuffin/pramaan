"""Advisory recommendation generation (LLM composes, never decides).

Stance is computed *deterministically* from vetoes + risk band. The rationale is
grounded strictly in the actual check summaries (no invented facts) and then
optionally polished by the LLM — with an empty .env the HeuristicLLM passes the
grounded text through unchanged, keeping demos reproducible.

Spec: docs/03-architecture/ai-verification-engine.md §5.  Advisory only.
"""
from __future__ import annotations

from typing import Any

from app.compliance.base import CheckContext, CheckOutput
from app.models.enums import RecommendationStance, RiskBand, Verdict
from app.providers.registry import get_llm

_SYSTEM_PROMPT = (
    "You are a compliance assistant for a government procurement officer. "
    "Summarize ONLY the verification findings provided. Do not invent facts, "
    "portal results, or identifiers. Your output is advisory; the officer decides."
)


def _stance(vetoes: list[dict[str, Any]], band: str) -> str:
    if vetoes:
        return RecommendationStance.RECOMMEND_DISQUALIFY.value
    if band == RiskBand.LOW.value:
        return RecommendationStance.RECOMMEND_QUALIFY.value
    # MEDIUM, or HIGH without a hard veto -> officer scrutiny
    return RecommendationStance.FURTHER_SCRUTINY.value


def _compose_rationale(
    ctx: CheckContext,
    checks: list[CheckOutput],
    score: dict[str, Any],
    stance: str,
) -> tuple[str, list[dict[str, Any]]]:
    name = getattr(ctx.bidder, "legal_name", None) or "The bidder"
    vetoes = score.get("vetoes", [])
    fails = [c for c in checks if c.verdict == Verdict.FAIL.value and not c.is_veto]
    warns = [c for c in checks if c.verdict == Verdict.WARN.value]
    unverifiable = [c for c in checks if c.verdict == Verdict.UNVERIFIABLE.value]
    passes = [c for c in checks if c.verdict == Verdict.PASS.value]

    parts: list[str] = []
    parts.append(
        f"{name} scored {score.get('score')} / 100 "
        f"({score.get('band')} risk band). "
    )
    evidence_refs: list[dict[str, Any]] = []

    if vetoes:
        v_txt = "; ".join(v.get("why") or v.get("key") for v in vetoes)
        parts.append(f"Critical veto(s) detected: {v_txt}. ")
        for v in vetoes:
            evidence_refs.append({"check_key": v.get("key"), "verdict": "FAIL", "summary": v.get("why")})
    if fails:
        f_txt = "; ".join(f"{c.check_key} — {c.summary}" for c in fails)
        parts.append(f"Failed checks: {f_txt}. ")
        for c in fails:
            evidence_refs.append({"check_key": c.check_key, "verdict": c.verdict, "summary": c.summary})
    if warns:
        w_txt = "; ".join(f"{c.check_key} — {c.summary}" for c in warns)
        parts.append(f"Warnings for review: {w_txt}. ")
        for c in warns:
            evidence_refs.append({"check_key": c.check_key, "verdict": c.verdict, "summary": c.summary})
    if unverifiable:
        u_txt = "; ".join(c.check_key for c in unverifiable)
        parts.append(
            f"Unverifiable (source unavailable — needs manual verification, not a failure): {u_txt}. "
        )
    if passes and not (vetoes or fails):
        parts.append(f"{len(passes)} check(s) passed verification. ")

    if stance == RecommendationStance.RECOMMEND_QUALIFY.value:
        parts.append("Recommendation for the officer's consideration: eligible to qualify.")
    elif stance == RecommendationStance.RECOMMEND_DISQUALIFY.value:
        parts.append(
            "Recommendation for the officer's consideration: strong grounds for disqualification; "
            "verify the flagged evidence before final decision."
        )
    else:
        parts.append(
            "Recommendation for the officer's consideration: further scrutiny before a decision."
        )

    return "".join(parts).strip(), evidence_refs


def recommend(
    ctx: CheckContext,
    checks: list[CheckOutput],
    score: dict[str, Any],
) -> dict[str, Any]:
    """Return {stance, rationale, evidence_refs, model_meta} — advisory only."""
    band = score.get("band", RiskBand.MEDIUM.value)
    vetoes = score.get("vetoes", [])
    stance = _stance(vetoes, band)

    grounded, evidence_refs = _compose_rationale(ctx, checks, score, stance)

    provider = "heuristic"
    model = "heuristic"
    mode = "SIMULATED"
    rationale = grounded
    try:
        llm = get_llm()
        result = llm.complete(
            [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": grounded},
            ]
        )
        provider = result.provider or provider
        model = result.model or model
        mode = result.mode or mode
        # Only adopt LLM text when a live model actually rewrote it; otherwise the
        # deterministic grounded rationale is canonical.
        if mode == "LIVE" and (result.text or "").strip():
            rationale = result.text.strip()
    except Exception as exc:  # noqa: BLE001 - recommendation must never crash a run
        model = f"heuristic (llm error: {exc})"

    return {
        "stance": stance,
        "rationale": rationale,
        "evidence_refs": evidence_refs,
        "model_meta": {
            "provider": provider,
            "model": model,
            "mode": mode,
            "advisory": True,
            "stance_rule": "deterministic(vetoes>band)",
        },
    }
