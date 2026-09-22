import asyncio
import json

import pytest

from reqlogue_api.domain.transcript import AudioTurn
from reqlogue_api.infrastructure.openai_whisper import (
    OpenAiRealtimeTranscriber,
    TranscriptWaitError,
    session_update_event,
)


class FakeSocket:
    def __init__(self, replies: list[str] | None = None) -> None:
        self.sent: list[object] = []
        self._replies = (
            [
                json.dumps({"type": "session.updated"}),
                json.dumps(
                    {
                        "type": "conversation.item.input_audio_transcription.completed",
                        "transcript": "要件を整理したい",
                    }
                ),
            ]
            if replies is None
            else replies
        )

    async def send(self, raw: str) -> None:
        self.sent.append(json.loads(raw))

    async def recv(self) -> str:
        if not self._replies:
            raise AssertionError("transcript wait did not stop")
        return self._replies.pop(0)

    async def close(self) -> None:
        return None


def _transcription(event: object) -> dict[str, object]:
    assert isinstance(event, dict)
    session = event["session"]
    assert isinstance(session, dict)
    audio = session["audio"]
    assert isinstance(audio, dict)
    audio_input = audio["input"]
    assert isinstance(audio_input, dict)
    transcription = audio_input["transcription"]
    assert isinstance(transcription, dict)
    return transcription


async def _transcribe(socket: FakeSocket, overview: str = "") -> str:
    async def connect(url: str, headers: list[str]) -> FakeSocket:
        assert url.endswith("intent=transcription")
        assert headers == ["Authorization: Bearer test-key"]
        return socket

    transcriber = OpenAiRealtimeTranscriber("test-key", connect)
    result = await transcriber.transcribe(AudioTurn(pcm=b"\x01\x02", overview=overview))
    return result.value


@pytest.mark.asyncio
async def test_openai_transcriber_appends_commits_and_reads_text() -> None:
    socket = FakeSocket()
    result = await _transcribe(socket)
    assert result == "要件を整理したい"
    transcription = _transcription(socket.sent[0])
    assert transcription["model"] == "gpt-live-transcribe"
    assert transcription["languages"] == ["ja"]
    assert "language" not in transcription
    assert "prompt" not in transcription
    assert transcription["delay"] == "low"
    assert socket.sent[0] == session_update_event("")
    assert socket.sent[1]["type"] == "input_audio_buffer.append"
    assert socket.sent[2] == {"type": "input_audio_buffer.commit"}
    assert "api.openai.com" not in json.dumps(socket.sent[0])


@pytest.mark.asyncio
async def test_nonempty_overview_is_sent_as_the_prompt() -> None:
    socket = FakeSocket()
    await _transcribe(socket, "新サービス")
    transcription = _transcription(socket.sent[0])
    assert transcription["prompt"] == "新サービス"
    assert socket.sent[0] == session_update_event("新サービス")


@pytest.mark.asyncio
async def test_empty_completed_transcript_ends_the_wait() -> None:
    socket = FakeSocket(
        [
            json.dumps({"type": "session.updated"}),
            json.dumps(
                {
                    "type": "conversation.item.input_audio_transcription.completed",
                    "transcript": "  ",
                }
            ),
        ]
    )
    assert await _transcribe(socket) == ""


@pytest.mark.asyncio
async def test_error_event_ends_the_wait() -> None:
    socket = FakeSocket(
        [
            json.dumps({"type": "session.updated"}),
            json.dumps({"type": "error", "error": {"message": "nope"}}),
        ]
    )
    with pytest.raises(TranscriptWaitError, match="transcription error"):
        await _transcribe(socket)


@pytest.mark.asyncio
async def test_wait_times_out_when_no_terminal_event_arrives(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "reqlogue_api.infrastructure.openai_whisper.TRANSCRIPT_WAIT_SECONDS",
        0.01,
    )

    class HangSocket(FakeSocket):
        async def recv(self) -> str:
            await asyncio.sleep(1)
            raise AssertionError("timeout should have ended the wait")

    with pytest.raises(TranscriptWaitError, match="timed out"):
        await _transcribe(HangSocket([]))
