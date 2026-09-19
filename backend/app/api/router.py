"""Aggregate API router. Feature routers are attached here as they are built.

The engine+API agent adds routers (auth, tenders, bidders, verification, etc.)
under app/api/routes/ and includes them below.
"""
from __future__ import annotations

from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pramaan-api"}


# --- feature routers (added by the engine+API agent) ---
# from app.api.routes import auth, tenders, bidders, verification, decisions, \
#     debarment, providers, audit, reports, analytics, graph
# for _m in (auth, tenders, bidders, verification, decisions, debarment,
#            providers, audit, reports, analytics, graph):
#     api_router.include_router(_m.router)
try:  # optional include so foundation runs before routes exist
    from app.api.routes import register_routes  # type: ignore

    register_routes(api_router)
except Exception:  # noqa: BLE001  (routes not built yet)
    pass
