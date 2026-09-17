"""Central configuration, loaded from environment variables / .env.

Every other module reads settings through `get_settings()` rather than
touching os.environ directly, so there is exactly one place that knows
where secrets and paths come from.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Anthropic ---
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-sonnet-5", alias="ANTHROPIC_MODEL")

    # --- WhatsApp Cloud API ---
    whatsapp_access_token: str = Field(default="", alias="WHATSAPP_ACCESS_TOKEN")
    whatsapp_phone_number_id: str = Field(default="", alias="WHATSAPP_PHONE_NUMBER_ID")
    whatsapp_verify_token: str = Field(default="", alias="WHATSAPP_VERIFY_TOKEN")
    whatsapp_app_secret: str = Field(default="", alias="WHATSAPP_APP_SECRET")
    whatsapp_allowlist: str = Field(default="", alias="WHATSAPP_ALLOWLIST")

    # --- Storage ---
    data_dir: Path = Field(default=Path("./data"), alias="DATA_DIR")
    sqlite_path: Path = Field(default=Path("./data/mjlis.sqlite3"), alias="SQLITE_PATH")
    chroma_dir: Path = Field(default=Path("./data/chroma"), alias="CHROMA_DIR")
    sources_iogp_dir: Path = Field(default=Path("./sources/iogp"), alias="SOURCES_IOGP_DIR")
    sources_external_dir: Path = Field(default=Path("./sources/external"), alias="SOURCES_EXTERNAL_DIR")

    # --- Embeddings ---
    embedding_model: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL")

    # --- Company source (reserved, disabled until access is approved) ---
    company_source_enabled: bool = Field(default=False, alias="COMPANY_SOURCE_ENABLED")
    company_source_name: str = Field(default="PDO LFI Alerts", alias="COMPANY_SOURCE_NAME")
    company_source_api_url: str = Field(default="", alias="COMPANY_SOURCE_API_URL")
    company_source_api_key: str = Field(default="", alias="COMPANY_SOURCE_API_KEY")
    company_source_sync_dir: str = Field(default="", alias="COMPANY_SOURCE_SYNC_DIR")

    # --- Logging ---
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_dir: Path = Field(default=Path("./logs"), alias="LOG_DIR")

    @property
    def whatsapp_allowlist_numbers(self) -> list[str]:
        return [n.strip() for n in self.whatsapp_allowlist.split(",") if n.strip()]

    def ensure_dirs(self) -> None:
        for d in (self.data_dir, self.chroma_dir, self.sources_iogp_dir, self.sources_external_dir, self.log_dir):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
