"""Feature routers. router.py calls register_routes(api_router)."""
from __future__ import annotations

from fastapi import APIRouter


def register_routes(api_router: APIRouter) -> None:
    from app.api.routes import (
        analytics,
        audit,
        auth,
        bidders,
        debarment,
        providers,
        reports,
        tenders,
        verification,
    )

    for module in (auth, tenders, bidders, verification, debarment,
                   providers, audit, analytics, reports):
        api_router.include_router(module.router)
