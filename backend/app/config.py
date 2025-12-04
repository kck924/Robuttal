from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Environment
    environment: str = "development"  # development | staging | production

    # Database (raw value from env)
    database_url: str = "postgresql+asyncpg://localhost/robuttal"

    @property
    def async_database_url(self) -> str:
        """Return database URL with proper asyncpg dialect.

        Railway URL-encodes + to _, so we need to fix it.
        Also handles plain postgresql:// URLs by adding asyncpg.
        Also strips any leading/trailing whitespace Railway may add.
        Note: SSL is handled via connect_args in database.py, not in URL.
        """
        url = self.database_url.strip()  # Remove any leading/trailing whitespace
        # Fix Railway's URL encoding of + to _
        if url.startswith("postgresql_asyncpg://"):
            url = url.replace("postgresql_asyncpg://", "postgresql+asyncpg://", 1)
        # Add asyncpg if missing
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def is_supabase(self) -> bool:
        """Check if using Supabase pooler connection."""
        return "pooler.supabase.com" in self.database_url

    # AI Provider API Keys
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""
    mistral_api_key: str = ""
    xai_api_key: str = ""
    deepseek_api_key: str = ""

    # CORS - comma-separated list of allowed origins
    allowed_origins: str = "http://localhost:3000"

    # App settings
    debug: bool = False
    topic_selection_mode: str = "hybrid"  # 'hybrid' | 'user_only' | 'backlog_only'

    # Twitter/X API credentials for automated posting
    twitter_enabled: bool = False  # Set to True to enable posting
    twitter_api_key: str = ""  # Also known as Consumer Key
    twitter_api_secret: str = ""  # Also known as Consumer Secret
    twitter_access_token: str = ""
    twitter_access_token_secret: str = ""
    twitter_bearer_token: str = ""  # Optional, for read-only operations

    @property
    def cors_origins(self) -> List[str]:
        """Parse allowed origins from comma-separated string."""
        if self.environment == "development":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
