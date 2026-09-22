import pytest

from reqlogue_api.main.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        orcarouter_api_key="",
        mindmap="stub",
        cors_origins=("http://127.0.0.1:3000",),
    )
