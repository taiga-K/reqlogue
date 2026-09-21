import json

import pytest

from reqlogue_api.infrastructure.openai_whisper import (
    OpenAiRealtimeTranscriber,
    session_update_event,
)


class FakeSocket:
    def __init__(self) -> None:
        self.sent: list[object] = []
        self._replies = [
            json.dumps({"type": "session.updated"}),
            json.dumps(
                {
                    "type": "conversation.item.input_audio_transcription.completed",
                    "transcript": "要件を整理したい",
                }
            ),
        ]

    async def send(self, raw: str) -> None:
        self.sent.append(json.loads(raw))

    async def recv(self) -> str:
        return self._replies.pop(0)

    async def close(self) -> None:
        return None


@pytest.mark.asyncio
async def test_openai_transcriber_appends_commits_and_reads_text() -> None:
    socket = FakeSocket()

    async def connect(url: str, headers: list[str]) -> FakeSocket:
        assert url.endswith("intent=transcription")
        assert headers == ["Authorization: Bearer test-key"]
        return socket

    transcriber = OpenAiRealtimeTranscriber("test-key", connect)
    result = await transcriber.transcribe(b"\x01\x02")
    assert result.value == "要件を整理したい"
    assert socket.sent[0] == session_update_event()
    assert socket.sent[1]["type"] == "input_audio_buffer.append"
    assert socket.sent[2] == {"type": "input_audio_buffer.commit"}
    assert "api.openai.com" not in json.dumps(socket.sent[0])
