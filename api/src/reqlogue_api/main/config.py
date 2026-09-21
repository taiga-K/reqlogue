import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    openai_api_key: str
    transcriber: str
    cors_origins: tuple[str, ...]


def load_settings(env: dict[str, str] | None = None) -> Settings:
    source = env if env is not None else dict(os.environ)
    raw_origins = source.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3217",
    )
    origins = tuple(
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    )
    api_key = source.get("OPENAI_API_KEY", "").strip()
    transcriber = source.get("REQLOGUE_TRANSCRIBER", "").strip()
    if transcriber == "":
        transcriber = "stub" if api_key == "" else "openai"
    return Settings(
        openai_api_key=api_key,
        transcriber=transcriber,
        cors_origins=origins,
    )
