"""Application settings, loaded from environment / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "dev"
    secret_key: str = "dev-only"

    database_url: str = "postgresql+asyncpg://agentforge:agentforge@localhost:5544/agentforge"
    sync_database_url: str = "postgresql+psycopg://agentforge:agentforge@localhost:5544/agentforge"
    redis_url: str = "redis://localhost:6390/0"

    # OpenAI-compatible LLM gateway (camel-hub)
    llm_base_url: str = "https://api.camel-hub.com/v1"
    llm_api_key: str = ""
    pllm_model: str = "claude-sonnet-4-5"
    qllm_model: str = "claude-haiku-4-5"

    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
