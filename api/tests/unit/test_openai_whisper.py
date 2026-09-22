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
    assert "delay" not in transcription
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


class QueueSocket:
    def __init__(self) -> None:
        self.sent: list[object] = []
        self.incoming: asyncio.Queue[str] = asyncio.Queue()

    async def send(self, raw: str) -> None:
        self.sent.append(json.loads(raw))

    async def recv(self) -> str:
        return await self.incoming.get()

    async def close(self) -> None:
        return None

    async def push(self, payload: object) -> None:
        await self.incoming.put(json.dumps(payload))


async def _open(socket: QueueSocket, overview: str = "") -> object:
    async def connect(url: str, headers: list[str]) -> QueueSocket:
        assert url.endswith("intent=transcription")
        assert headers == ["Authorization: Bearer test-key"]
        return socket

    transcriber = OpenAiRealtimeTranscriber("test-key", connect)
    return await transcriber.open_session(overview)


def _event_types(socket: QueueSocket) -> list[object]:
    return [
        event["type"]
        for event in socket.sent
        if isinstance(event, dict) and "type" in event
    ]


@pytest.mark.asyncio
async def test_live_session_yields_deltas_and_skips_the_completed_turn(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "reqlogue_api.infrastructure.openai_whisper.TRANSCRIPT_WAIT_SECONDS",
        0.01,
    )
    socket = QueueSocket()
    session = await _open(socket, "新サービス")
    try:
        transcription = _transcription(socket.sent[0])
        assert transcription["prompt"] == "新サービス"
        assert "delay" not in transcription
        await session.append(b"\x01")
        await session.append(b"\x02")
        assert _event_types(socket) == [
            "session.update",
            "input_audio_buffer.append",
            "input_audio_buffer.append",
        ]
        session_event = socket.sent[0]
        assert isinstance(session_event, dict)
        audio = session_event["session"]
        assert isinstance(audio, dict)
        audio_input = audio["audio"]
        assert isinstance(audio_input, dict)
        stream_input = audio_input["input"]
        assert isinstance(stream_input, dict)
        assert stream_input["turn_detection"] == {"type": "server_vad"}

        pieces = session.__aiter__()
        await socket.push(
            {
                "type": "conversation.item.input_audio_transcription.delta",
                "item_id": "item_1",
                "delta": "ログイン",
            }
        )
        first = await asyncio.wait_for(pieces.__anext__(), 1)
        assert first.value == "ログイン"
        await socket.push(
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "item_id": "item_1",
                "transcript": "ログインはメール",
            }
        )
        await socket.push(
            {
                "type": "conversation.item.input_audio_transcription.delta",
                "item_id": "item_2",
                "delta": "パスワード",
            }
        )
        second = await asyncio.wait_for(pieces.__anext__(), 1)
        assert second.value == "パスワード"
    finally:
        await session.close()


@pytest.mark.asyncio
async def test_live_session_raises_when_transcription_fails() -> None:
    socket = QueueSocket()
    session = await _open(socket)
    pieces = session.__aiter__()
    await socket.push({"type": "error"})
    with pytest.raises(TranscriptWaitError, match="transcription error"):
        await asyncio.wait_for(pieces.__anext__(), 1)
    await session.close()
