import pytest

from reqlogue_api.main.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        openai_api_key="",
        transcriber="stub",
        orcarouter_api_key="",
        mindmap="stub",
        cors_origins=("http://127.0.0.1:3000",),
    )
