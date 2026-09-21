import pytest

from reqlogue_api.infrastructure.openai_whisper import OpenAiRealtimeTranscriber
from reqlogue_api.infrastructure.stub_transcriber import StubTranscriber
from reqlogue_api.main.config import Settings
from reqlogue_api.main.ioc import build_transcriber


def test_unknown_transcriber_is_rejected() -> None:
    with pytest.raises(RuntimeError, match="Unsupported transcriber: opneai"):
        build_transcriber(
            Settings(
                openai_api_key="",
                transcriber="opneai",
                cors_origins=("http://127.0.0.1:3000",),
            )
        )


def test_stub_and_openai_are_selected_explicitly() -> None:
    stub = build_transcriber(
        Settings(
            openai_api_key="",
            transcriber="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    openai = build_transcriber(
        Settings(
            openai_api_key="test-key",
            transcriber="openai",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    assert isinstance(stub, StubTranscriber)
    assert isinstance(openai, OpenAiRealtimeTranscriber)
