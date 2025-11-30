from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Environment
    environment: str = "development"  # development | staging | production

    # Database
    database_url: str = "postgresql+asyncpg://localhost/robuttal"

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
