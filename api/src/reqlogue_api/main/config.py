import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    orcarouter_api_key: str
    mindmap: str
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
    orcarouter_api_key = source.get("ORCAROUTER_API_KEY", "").strip()
    mindmap = source.get("REQLOGUE_MINDMAP", "").strip()
    if mindmap == "":
        mindmap = "stub" if orcarouter_api_key == "" else "orcarouter"
    return Settings(
        orcarouter_api_key=orcarouter_api_key,
        mindmap=mindmap,
        cors_origins=origins,
    )
