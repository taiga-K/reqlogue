import asyncio
import json

import pytest

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


async def _transcribe(socket: FakeSocket) -> str:
    async def connect(url: str, headers: list[str]) -> FakeSocket:
        assert url.endswith("intent=transcription")
        assert headers == ["Authorization: Bearer test-key"]
        return socket

    transcriber = OpenAiRealtimeTranscriber("test-key", connect)
    result = await transcriber.transcribe(b"\x01\x02")
    return result.value


@pytest.mark.asyncio
async def test_openai_transcriber_appends_commits_and_reads_text() -> None:
    socket = FakeSocket()
    result = await _transcribe(socket)
    assert result == "要件を整理したい"
    assert socket.sent[0] == session_update_event()
    assert socket.sent[1]["type"] == "input_audio_buffer.append"
    assert socket.sent[2] == {"type": "input_audio_buffer.commit"}
    assert "api.openai.com" not in json.dumps(socket.sent[0])


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
