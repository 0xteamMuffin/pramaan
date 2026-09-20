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


# --- feature routers ---
from app.api.routes import register_routes  # noqa: E402

register_routes(api_router)
