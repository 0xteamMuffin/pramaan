"""AI verification engine: extraction, cross-check, forgery, graph, recommend.

AI never emits an opaque verdict — every capability produces structured findings
that the deterministic compliance engine turns into check results + evidence.
Spec: docs/03-architecture/ai-verification-engine.md
"""
from __future__ import annotations

from app.ai import crosscheck, extraction, forgery, graph, recommend  # noqa: F401

__all__ = ["extraction", "crosscheck", "forgery", "graph", "recommend"]
