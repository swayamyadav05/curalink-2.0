from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "phi3:mini"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.1-8b-instant"
    port: int = 8000
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @field_validator("ollama_host")
    @classmethod
    def validate_ollama_host(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("OLLAMA_HOST must start with http:// or https://")
        return normalized

    @field_validator("port")
    @classmethod
    def validate_port(cls, value: int) -> int:
        if value < 1 or value > 65535:
            raise ValueError("PORT must be between 1 and 65535")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",") if origin.strip()]
            if not origins:
                raise ValueError("CORS_ORIGINS must include at least one origin")
            return origins
        if isinstance(value, list) and all(isinstance(item, str) for item in value):
            return value
        raise ValueError("CORS_ORIGINS must be a comma-separated string or list of strings")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
