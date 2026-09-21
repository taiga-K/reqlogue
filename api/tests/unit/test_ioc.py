import pytest

from reqlogue_api.infrastructure.openai_whisper import OpenAiRealtimeTranscriber
from reqlogue_api.infrastructure.orcarouter_advice import OrcaRouterAdviceAnalyzer
from reqlogue_api.infrastructure.orcarouter_mindmap import OrcaRouterMindmapGenerator
from reqlogue_api.infrastructure.stub_advice import StubAdviceAnalyzer
from reqlogue_api.infrastructure.stub_mindmap import StubMindmapGenerator
from reqlogue_api.infrastructure.stub_transcriber import StubTranscriber
from reqlogue_api.main.config import Settings
from reqlogue_api.main.ioc import (
    build_advice_analyzer,
    build_mindmap_generator,
    build_transcriber,
)


def test_unknown_transcriber_is_rejected() -> None:
    with pytest.raises(RuntimeError, match="Unsupported transcriber: opneai"):
        build_transcriber(
            Settings(
                openai_api_key="",
                transcriber="opneai",
                orcarouter_api_key="",
                mindmap="stub",
                cors_origins=("http://127.0.0.1:3000",),
            )
        )


def test_stub_and_openai_are_selected_explicitly() -> None:
    stub = build_transcriber(
        Settings(
            openai_api_key="",
            transcriber="stub",
            orcarouter_api_key="",
            mindmap="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    openai = build_transcriber(
        Settings(
            openai_api_key="test-key",
            transcriber="openai",
            orcarouter_api_key="",
            mindmap="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    assert isinstance(stub, StubTranscriber)
    assert isinstance(openai, OpenAiRealtimeTranscriber)


def test_stub_and_orcarouter_mindmap_are_selected_explicitly() -> None:
    stub = build_mindmap_generator(
        Settings(
            openai_api_key="",
            transcriber="stub",
            orcarouter_api_key="",
            mindmap="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    live = build_mindmap_generator(
        Settings(
            openai_api_key="",
            transcriber="stub",
            orcarouter_api_key="orca-key",
            mindmap="orcarouter",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    assert isinstance(stub, StubMindmapGenerator)
    assert isinstance(live, OrcaRouterMindmapGenerator)


def test_stub_and_orcarouter_advice_follow_the_mindmap_mode() -> None:
    stub = build_advice_analyzer(
        Settings(
            openai_api_key="",
            transcriber="stub",
            orcarouter_api_key="",
            mindmap="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    live = build_advice_analyzer(
        Settings(
            openai_api_key="",
            transcriber="stub",
            orcarouter_api_key="orca-key",
            mindmap="orcarouter",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    assert isinstance(stub, StubAdviceAnalyzer)
    assert isinstance(live, OrcaRouterAdviceAnalyzer)


def test_orcarouter_advice_requires_key() -> None:
    with pytest.raises(RuntimeError, match="ORCAROUTER_API_KEY"):
        build_advice_analyzer(
            Settings(
                openai_api_key="",
                transcriber="stub",
                orcarouter_api_key="",
                mindmap="orcarouter",
                cors_origins=("http://127.0.0.1:3000",),
            )
        )


def test_orcarouter_mindmap_requires_key() -> None:
    with pytest.raises(RuntimeError, match="ORCAROUTER_API_KEY"):
        build_mindmap_generator(
            Settings(
                openai_api_key="",
                transcriber="stub",
                orcarouter_api_key="",
                mindmap="orcarouter",
                cors_origins=("http://127.0.0.1:3000",),
            )
        )
