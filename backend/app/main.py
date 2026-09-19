"""FastAPI application factory for PRAMAAN."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.router import api_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PRAMAAN API",
        description=(
            "AI-Powered Integrated Bid Compliance Verification Platform for GeM "
            "Procurement (SIH PS-26100). Decision-support only — the officer decides."
        ),
        version=__version__,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {
            "name": "PRAMAAN",
            "docs": "/docs",
            "api": "/api/v1",
            "version": __version__,
        }

    return app


app = create_app()
