"""Shared rule helpers: regex validators, ID parsing, name reconciliation,
constitution↔PAN mapping, and tender-param accessors.

Rules are *data-first*: thresholds/params come from the tender requirement, and
these helpers only implement the deterministic primitives the checks compose.

Regex reference (docs/03-architecture/ai-verification-engine.md §1):
  PAN   ^[A-Z]{5}[0-9]{4}[A-Z]$        (4th char = holder type)
  GSTIN ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$
  Udyam ^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$
  CIN   ^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$
  DPIIT ^DIPP[0-9]+$   ESIC ^[0-9]{17}$   BIS ISI ^CM/L-?[0-9]{6,8}$   CRS ^R-?[0-9]{10}$
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from dateutil import parser as _dtparser
from rapidfuzz import fuzz

# --------------------------------------------------------------------------- #
# Compiled regexes
# --------------------------------------------------------------------------- #
RE_PAN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
RE_GSTIN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
RE_UDYAM = re.compile(r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$")
RE_CIN = re.compile(r"^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$")
RE_DIN = re.compile(r"^[0-9]{8}$")
RE_DPIIT = re.compile(r"^DIPP[0-9]+$")
RE_ESIC = re.compile(r"^[0-9]{17}$")
RE_BIS_ISI = re.compile(r"^CM/L-?[0-9]{6,8}$")
RE_BIS_CRS = re.compile(r"^R-?[0-9]{10}$")

# --------------------------------------------------------------------------- #
# PAN 4th-char holder types + constitution mapping
# --------------------------------------------------------------------------- #
PAN_HOLDER_TYPES: dict[str, str] = {
    "P": "Individual",
    "C": "Company",
    "H": "HUF",
    "F": "Firm/LLP",
    "A": "Association of Persons (AOP)",
    "T": "Trust",
    "B": "Body of Individuals (BOI)",
    "L": "Local Authority",
    "J": "Artificial Juridical Person",
    "G": "Government",
}

# Keyword -> expected PAN 4th char. Matched by longest keyword first (substring).
_CONSTITUTION_PAN_CHAR: dict[str, str] = {
    "private limited": "C",
    "public limited": "C",
    "private ltd": "C",
    "public ltd": "C",
    "pvt ltd": "C",
    "company": "C",
    "limited liability partnership": "F",
    "llp": "F",
    "partnership firm": "F",
    "partnership": "F",
    "firm": "F",
    "sole proprietor": "P",
    "proprietorship": "P",
    "proprietor": "P",
    "individual": "P",
    "hindu undivided family": "H",
    "huf": "H",
    "trust": "T",
    "association of persons": "A",
    "society": "A",
    "aop": "A",
    "body of individuals": "B",
    "boi": "B",
    "local authority": "L",
    "government": "G",
}

# Name suffix noise to strip before fuzzy comparison
_NAME_SUFFIXES = [
    "private limited", "public limited", "pvt ltd", "pvt. ltd.", "pvt limited",
    "private ltd", "limited", "ltd", "llp", "l.l.p", "llc", "inc", "incorporated",
    "corporation", "corp", "& co", "and co", "co.", "company", "enterprises",
    "enterprise",
]

NAME_MATCH_THRESHOLD = 86  # token_set_ratio below this -> mismatch/warn


# --------------------------------------------------------------------------- #
# Format validators
# --------------------------------------------------------------------------- #
def _clean(v: str | None) -> str:
    return (v or "").strip().upper()


def validate_pan(v: str | None) -> bool:
    return bool(RE_PAN.match(_clean(v)))


def validate_gstin(v: str | None) -> bool:
    return bool(RE_GSTIN.match(_clean(v)))


def validate_udyam(v: str | None) -> bool:
    return bool(RE_UDYAM.match(_clean(v)))


def validate_cin(v: str | None) -> bool:
    return bool(RE_CIN.match(_clean(v)))


def validate_din(v: str | None) -> bool:
    return bool(RE_DIN.match(_clean(v)))


def validate_dpiit(v: str | None) -> bool:
    return bool(RE_DPIIT.match(_clean(v)))


def validate_esic(v: str | None) -> bool:
    return bool(RE_ESIC.match(_clean(v)))


def validate_bis(v: str | None) -> bool:
    val = _clean(v)
    return bool(RE_BIS_ISI.match(val) or RE_BIS_CRS.match(val))


# --------------------------------------------------------------------------- #
# ID parsing / derivations
# --------------------------------------------------------------------------- #
def pan_holder_type(pan: str | None) -> str | None:
    """Return the human holder-type from PAN's 4th char, or None if malformed."""
    p = _clean(pan)
    if not validate_pan(p):
        return None
    return PAN_HOLDER_TYPES.get(p[3])


def pan_holder_char(pan: str | None) -> str | None:
    p = _clean(pan)
    if len(p) >= 4:
        return p[3]
    return None


def pan_from_gstin(gstin: str | None) -> str | None:
    """GSTIN embeds PAN in chars 3-12 (index 2:12)."""
    g = _clean(gstin)
    if len(g) >= 12:
        candidate = g[2:12]
        if validate_pan(candidate):
            return candidate
    return None


def year_from_cin(cin: str | None) -> int | None:
    """CIN encodes incorporation year at index 8:12."""
    c = _clean(cin)
    if validate_cin(c):
        try:
            return int(c[8:12])
        except ValueError:
            return None
    return None


def constitution_expected_pan_char(constitution: str | None) -> str | None:
    """Map a declared constitution string to the PAN 4th char it should carry."""
    if not constitution:
        return None
    norm = constitution.strip().lower()
    if norm in _CONSTITUTION_PAN_CHAR:
        return _CONSTITUTION_PAN_CHAR[norm]
    # longest-keyword substring match
    for kw in sorted(_CONSTITUTION_PAN_CHAR, key=len, reverse=True):
        if kw in norm:
            return _CONSTITUTION_PAN_CHAR[kw]
    return None


def is_company_like(constitution: str | None) -> bool:
    """True when the entity is expected to have a CIN (company/LLP)."""
    ch = constitution_expected_pan_char(constitution)
    return ch in {"C", "F"} and bool(constitution) and (
        "company" in (constitution or "").lower()
        or "ltd" in (constitution or "").lower()
        or "limited" in (constitution or "").lower()
        or "llp" in (constitution or "").lower()
    )


# --------------------------------------------------------------------------- #
# Name normalization + fuzzy match
# --------------------------------------------------------------------------- #
def normalize_name(name: str | None) -> str:
    if not name:
        return ""
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\s&]", " ", s)
    for suf in sorted(_NAME_SUFFIXES, key=len, reverse=True):
        s = re.sub(rf"\b{re.escape(suf)}\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def name_similarity(a: str | None, b: str | None) -> float:
    """0-100 token-set-ratio on normalized names. Empty inputs -> 0."""
    na, nb = normalize_name(a), normalize_name(b)
    if not na or not nb:
        return 0.0
    return float(fuzz.token_set_ratio(na, nb))


def names_match(a: str | None, b: str | None, threshold: float = NAME_MATCH_THRESHOLD) -> bool:
    return name_similarity(a, b) >= threshold


# --------------------------------------------------------------------------- #
# Dates
# --------------------------------------------------------------------------- #
def parse_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return _dtparser.parse(str(value), dayfirst=True).date()
    except (ValueError, OverflowError, TypeError):
        return None


def is_expired(valid_till: Any, as_of: date | None = None) -> bool | None:
    """True if expired, False if valid, None if the date is unparseable/absent."""
    d = parse_date(valid_till)
    if d is None:
        return None
    ref = as_of or date.today()
    return d < ref


# --------------------------------------------------------------------------- #
# Tender param accessors + portal helpers
# --------------------------------------------------------------------------- #
def param(ctx: Any, key: str, default: Any = None) -> Any:
    """Read a tender-rule param from ctx.params (falls back to requirement.params)."""
    params = getattr(ctx, "params", None) or {}
    if key in params:
        return params[key]
    req = getattr(ctx, "requirement", None)
    if req is not None:
        rp = getattr(req, "params", None) or {}
        if key in rp:
            return rp[key]
    return default


def is_mandatory(ctx: Any, default: bool = True) -> bool:
    req = getattr(ctx, "requirement", None)
    if req is None:
        return default
    return bool(getattr(req, "mandatory", default))


def portal(ctx: Any, key: str) -> dict[str, Any]:
    """Return the raw portal envelope {ok,data,source,method,mode,...} for a check."""
    return dict((getattr(ctx, "portal", None) or {}).get(key) or {})


def portal_data(ctx: Any, key: str) -> dict[str, Any]:
    return dict(portal(ctx, key).get("data") or {})


def portal_meta(ctx: Any, key: str) -> tuple[str | None, str | None, str | None]:
    """(source, method, mode) for evidence stamping."""
    p = portal(ctx, key)
    return p.get("source"), p.get("method"), p.get("mode")


def first(d: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Return the first present, non-None value among candidate keys (case-insensitive)."""
    if not d:
        return default
    lower = {str(k).lower(): v for k, v in d.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v not in (None, ""):
            return v
    return default


# Status vocabulary shared across portal checks
_INACTIVE_TOKENS = {
    "cancelled", "canceled", "inactive", "suspended", "struck off", "struck-off",
    "struckoff", "dormant", "deregistered", "revoked", "expired", "closed",
    "not active", "surrendered", "blacklisted",
}
_ACTIVE_TOKENS = {"active", "valid", "registered", "approved", "verified", "live"}


def status_is_inactive(status: Any) -> bool:
    s = str(status or "").strip().lower()
    if not s:
        return False
    return any(tok in s for tok in _INACTIVE_TOKENS)


def status_is_active(status: Any) -> bool:
    s = str(status or "").strip().lower()
    if not s:
        return False
    if status_is_inactive(s):
        return False
    return any(tok in s for tok in _ACTIVE_TOKENS)
