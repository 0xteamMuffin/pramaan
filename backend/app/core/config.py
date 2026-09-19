"""Application settings.

EMPTY-KEY RULE: every secret defaults to "" so the whole app runs with an empty
`.env`. Providers fall back to deterministic mock/offline implementations when
their key is missing, and upgrade to "live" only when a key is present.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

# repo root = backend/.. ; backend dir = this file's parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- App ----
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str = "dev-insecure-change-me"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    access_token_ttl_minutes: int = 720

    # ---- Database ----
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'pramaan.db').as_posix()}"

    # ---- AI provider keys (optional) ----
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    docai_processor: str = ""
    google_application_credentials: str = ""

    # ---- Government aggregator (optional) ----
    sandbox_base_url: str = "https://test-api.sandbox.co.in"
    sandbox_key: str = ""
    sandbox_secret: str = ""
    cashfree_client_id: str = ""
    cashfree_client_secret: str = ""

    # ---- Local LLM (offline fallback) ----
    ollama_base_url: str = "http://localhost:11434/v1"

    # ---- Storage / config ----
    storage_dir: str = (BACKEND_DIR / "uploads").as_posix()
    providers_config: str = ""  # path override; else providers.yaml then providers.example.yaml

    # -------- Derived helpers --------
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def has_groq(self) -> bool:
        return bool(self.groq_api_key.strip())

    @property
    def has_openrouter(self) -> bool:
        return bool(self.openrouter_api_key.strip())

    @property
    def has_sandbox(self) -> bool:
        return bool(self.sandbox_key.strip() and self.sandbox_secret.strip())

    @property
    def has_any_live_llm(self) -> bool:
        return self.has_gemini or self.has_groq or self.has_openrouter

    def providers_config_path(self) -> Path:
        if self.providers_config:
            return Path(self.providers_config)
        local = REPO_ROOT / "providers.yaml"
        if local.exists():
            return local
        return REPO_ROOT / "providers.example.yaml"

    def load_providers_config(self) -> dict:
        path = self.providers_config_path()
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return yaml.safe_load(fh) or {}
        except FileNotFoundError:
            return {}


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    os.makedirs(settings.storage_dir, exist_ok=True)
    return settings


settings = get_settings()
