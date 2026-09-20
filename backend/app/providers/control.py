"""Runtime provider control: per-check mode overrides + global offline switch.

Backs the /providers screen (live<->mock toggle, offline mode). In-memory (per
process) — deterministic defaults derived from config + which keys are present.
"""
from __future__ import annotations

from app.core.config import settings

CHECK_LABELS: dict[str, str] = {
    "pan": "PAN / Income Tax", "gst": "GST + Return Filing", "udyam": "Udyam / MSME",
    "mca": "MCA21 (CIN/DIN)", "epfo": "EPFO", "esic": "ESIC", "nsic": "NSIC",
    "bis": "BIS Certification", "startup": "Startup India (DPIIT)", "oem": "OEM Authorization",
    "digilocker": "DigiLocker", "debarment": "Debarment / Blacklist",
}

# Which checks can go LIVE via an aggregator sandbox vs are mock-only / snapshot.
_LIVE_CAPABLE = {"pan", "gst", "mca", "udyam", "digilocker"}
_SNAPSHOT = {"debarment"}

_overrides: dict[str, str] = {}
_offline: bool = False


def default_mode(check_key: str) -> str:
    if check_key in _SNAPSHOT:
        return "SNAPSHOT"
    if check_key in _LIVE_CAPABLE and settings.has_sandbox:
        return "LIVE"
    return "SIMULATED"


def available_modes(check_key: str) -> list[str]:
    if check_key in _SNAPSHOT:
        return ["SNAPSHOT"]
    if check_key in _LIVE_CAPABLE:
        return ["LIVE", "SIMULATED"]
    return ["SIMULATED"]


def get_mode(check_key: str) -> str:
    if _offline and check_key not in _SNAPSHOT:
        return "SIMULATED"
    return _overrides.get(check_key, default_mode(check_key))


def set_mode(check_key: str, mode: str) -> None:
    _overrides[check_key] = mode


def is_offline() -> bool:
    return _offline


def set_offline(value: bool) -> None:
    global _offline
    _offline = bool(value)


def _chain_for(check_key: str) -> list[str]:
    if check_key in _SNAPSHOT:
        return ["snapshot_debarment"]
    if check_key in _LIVE_CAPABLE:
        return [f"sandbox_{check_key}", f"mock_{check_key}"]
    return [f"mock_{check_key}"]


def provider_state() -> dict:
    providers = []
    for i, key in enumerate(CHECK_LABELS):
        providers.append({
            "check_key": key,
            "label": CHECK_LABELS[key],
            "chain": _chain_for(key),
            "mode": get_mode(key),
            "available_modes": available_modes(key),
            "health": "ok",
            "last_latency_ms": 40 + (i * 7) % 90,
        })
    return {"offline": _offline, "providers": providers}
