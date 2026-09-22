import pytest

from reqlogue_api.application.transcribe import transcribe_audio
from reqlogue_api.domain.transcript import AudioTurn, TranscriptText
from reqlogue_api.infrastructure.stub_transcriber import (
    STUB_TRANSCRIPT,
    StubTranscriber,
)


@pytest.mark.asyncio
async def test_empty_audio_returns_empty_text() -> None:
    result = await transcribe_audio(StubTranscriber(), AudioTurn(pcm=b"", overview=""))
    assert result == TranscriptText("")


@pytest.mark.asyncio
async def test_stub_transcribes_any_pcm_to_the_stub_line() -> None:
    result = await transcribe_audio(
        StubTranscriber(),
        AudioTurn(pcm=b"\x00\x01", overview="ignored"),
    )
    assert result == TranscriptText(STUB_TRANSCRIPT)
