"""Deterministic, format-VALID fake government identifier generators.

Every ID is fake (no real PII) but passes the regex validation used across the
platform (see docs/03-architecture/ai-verification-engine.md §1):

    PAN    ^[A-Z]{5}[0-9]{4}[A-Z]$              (4th char encodes holder type)
    GSTIN  ^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$  (embeds PAN in 3-12)
    Udyam  ^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$
    CIN    ^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$     (year controllable)
    DIN    ^[0-9]{8}$
    ESIC   ^[0-9]{17}$
    DPIIT  ^DIPP[0-9]+$
    BIS    ISI ^CM/L-?[0-9]{6,8}$  |  CRS ^R-?[0-9]{10}$

Determinism: values derive from a stable SHA-256 keyed byte stream, so the same
`key` always yields the same identifier regardless of call order.
"""
from __future__ import annotations

import hashlib
from collections.abc import Iterator

SEED = 26100  # SIH problem-statement number; flavours the deterministic stream

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGITS = "0123456789"
# GSTIN checksum alphabet (base-36)
_GST_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# PAN 4th character encodes the holder/constitution type (used for the
# constitution-vs-PAN mismatch fraud).
PAN_HOLDER_TYPE: dict[str, str] = {
    "Individual": "P",
    "Proprietorship": "P",
    "Sole Proprietorship": "P",
    "Company": "C",
    "Private Limited": "C",
    "Public Limited": "C",
    "Firm": "F",
    "Partnership": "F",
    "Partnership Firm": "F",
    "LLP": "F",
    "HUF": "H",
    "Trust": "T",
    "AOP": "A",
    "Association": "A",
    "BOI": "B",
    "Government": "G",
    "Local Authority": "L",
    "Artificial Juridical": "J",
}

# A few realistic-looking state codes (GSTIN prefix / Udyam state code).
STATE_CODES: dict[str, str] = {
    "TN": "33", "UP": "09", "TG": "36", "DL": "07",
    "MH": "27", "KA": "29", "GJ": "24", "WB": "19",
}


# --------------------------------------------------------------------------- #
# Deterministic keyed byte stream
# --------------------------------------------------------------------------- #
def _stream(key: str) -> Iterator[int]:
    """Infinite deterministic byte stream seeded by `key` (+ global SEED)."""
    counter = 0
    while True:
        block = hashlib.sha256(f"pramaan::{SEED}::{key}::{counter}".encode()).digest()
        yield from block
        counter += 1


def _letters(key: str, n: int) -> str:
    g = _stream(key + "|L")
    return "".join(LETTERS[next(g) % 26] for _ in range(n))


def _digits(key: str, n: int) -> str:
    g = _stream(key + "|D")
    return "".join(DIGITS[next(g) % 10] for _ in range(n))


# --------------------------------------------------------------------------- #
# PAN
# --------------------------------------------------------------------------- #
def make_pan(key: str, holder_type: str = "C", name_initial: str | None = None) -> str:
    """Format-valid PAN. `holder_type` is the raw 4th char (P/C/F/...).

    Pass a constitution string via `pan_for_constitution` to derive the char.
    `name_initial` fills the 5th char (first letter of surname/entity name).
    """
    first3 = _letters(key + "|pan3", 3)
    fifth = (name_initial or _letters(key + "|pan5", 1))[0].upper()
    four = _digits(key + "|pan4", 4)
    last = _letters(key + "|panL", 1)
    return f"{first3}{holder_type[0].upper()}{fifth}{four}{last}"


def pan_for_constitution(key: str, constitution: str, name_initial: str | None = None) -> str:
    holder = PAN_HOLDER_TYPE.get(constitution, "C")
    return make_pan(key, holder_type=holder, name_initial=name_initial)


# --------------------------------------------------------------------------- #
# GSTIN (embeds a given PAN in chars 3-12; computes the real check digit)
# --------------------------------------------------------------------------- #
def gstin_check_digit(gstin14: str) -> str:
    """Standard GSTIN checksum (base-36, alternating factor 1/2)."""
    factor = 2
    total = 0
    for ch in reversed(gstin14):
        code = _GST_ALPHABET.index(ch)
        product = factor * code
        factor = 1 if factor == 2 else 2
        product = (product // 36) + (product % 36)
        total += product
    check = (36 - (total % 36)) % 36
    return _GST_ALPHABET[check]


def make_gstin(pan: str, state: str = "TN", entity_no: str = "1") -> str:
    """15-char GSTIN embedding `pan` (chars 3-12), with a valid checksum char."""
    state_code = STATE_CODES.get(state, state if state.isdigit() else "33")
    core14 = f"{state_code}{pan}{entity_no}Z"  # 2 + 10 + 1 + 1 = 14
    return core14 + gstin_check_digit(core14)


# --------------------------------------------------------------------------- #
# Udyam
# --------------------------------------------------------------------------- #
def make_udyam(key: str, state: str = "TN", district: str | None = None, num: str | None = None) -> str:
    dd = district or _digits(key + "|ud_dd", 2)
    nn = num or _digits(key + "|ud_n", 7)
    return f"UDYAM-{state}-{dd}-{nn}"


# --------------------------------------------------------------------------- #
# CIN (year planted for shell / vintage fraud)
# --------------------------------------------------------------------------- #
def make_cin(
    key: str,
    year: int = 2015,
    listed: bool = False,
    state: str = "TN",
    industry: str | None = None,
    company_class: str | None = None,
) -> str:
    prefix = "L" if listed else "U"
    ind = industry or _digits(key + "|cin_ind", 5)
    klass = (company_class or _letters(key + "|cin_cls", 3))[:3].upper()
    seq = _digits(key + "|cin_seq", 6)
    return f"{prefix}{ind}{state}{year}{klass}{seq}"


# --------------------------------------------------------------------------- #
# DIN (8 digits — sharable across bidders for related-party rings)
# --------------------------------------------------------------------------- #
def make_din(key: str | None = None, value: str | None = None) -> str:
    if value:
        return value
    assert key is not None, "make_din requires key or value"
    # ensure leading digit is non-zero for realism
    d = _digits(key + "|din", 8)
    if d[0] == "0":
        d = "1" + d[1:]
    return d


# --------------------------------------------------------------------------- #
# EPFO establishment code · ESIC 17-digit · DPIIT · BIS · NSIC
# --------------------------------------------------------------------------- #
def make_epfo(key: str, region: str = "DL", office: str = "CPM") -> str:
    """Establishment code: region(2L) + office(3L) + est-id(7D) + extension(3D)."""
    est = _digits(key + "|epfo_est", 7)
    return f"{region}{office}{est}000"


def make_esic(key: str) -> str:
    d = _digits(key + "|esic", 17)
    if d[0] == "0":
        d = "1" + d[1:]
    return d


def make_dpiit(key: str, num: str | None = None) -> str:
    return "DIPP" + (num or _digits(key + "|dpiit", 5))


def make_bis_isi(key: str, num: str | None = None) -> str:
    """ISI mark licence (product certification), e.g. CM/L-1234567."""
    return "CM/L-" + (num or _digits(key + "|bis_isi", 7))


def make_bis_crs(key: str, num: str | None = None) -> str:
    """CRS registration (electronics/IT), e.g. R-1234567890."""
    return "R-" + (num or _digits(key + "|bis_crs", 10))


def make_nsic(key: str) -> str:
    return "NSIC/GP/" + _digits(key + "|nsic", 7)


def make_oem_auth(key: str, brand: str) -> str:
    """OEM manufacturer-authorisation-form reference (filename-safe, no slash)."""
    brand_tag = "".join(c for c in brand.upper() if c.isalnum())[:6] or "OEM"
    return f"MAF{brand_tag}{_digits(key + '|maf', 6)}"


__all__ = [
    "SEED",
    "PAN_HOLDER_TYPE",
    "STATE_CODES",
    "make_pan",
    "pan_for_constitution",
    "gstin_check_digit",
    "make_gstin",
    "make_udyam",
    "make_cin",
    "make_din",
    "make_epfo",
    "make_esic",
    "make_dpiit",
    "make_bis_isi",
    "make_bis_crs",
    "make_nsic",
    "make_oem_auth",
]
