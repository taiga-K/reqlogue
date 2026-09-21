import asyncio
import base64
import json
from collections.abc import Awaitable, Callable

from reqlogue_api.domain.transcript import TranscriptText
from reqlogue_api.infrastructure.openai_events import (
    parse_event_message,
    transcript_from_event,
)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription"
WHISPER_MODEL = "gpt-realtime-whisper"

SessionUpdate = dict[str, object]


def session_update_event() -> SessionUpdate:
    return {
        "type": "session.update",
        "session": {
            "type": "transcription",
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": 24000},
                    "transcription": {
                        "model": WHISPER_MODEL,
                        "language": "ja",
                        "delay": "low",
                    },
                    "turn_detection": None,
                }
            },
        },
    }


class OpenAiRealtimeTranscriber:
    def __init__(
        self,
        api_key: str,
        connect: Callable[[str, list[str]], Awaitable[object]],
    ) -> None:
        self._api_key = api_key
        self._connect = connect

    async def transcribe(self, pcm16_mono_24k: bytes) -> TranscriptText:
        headers = [f"Authorization: Bearer {self._api_key}"]
        websocket = await self._connect(OPENAI_REALTIME_URL, headers)
        try:
            await _send_json(websocket, session_update_event())
            await _send_json(
                websocket,
                {
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(pcm16_mono_24k).decode("ascii"),
                },
            )
            await _send_json(websocket, {"type": "input_audio_buffer.commit"})
            text = await _wait_for_transcript(websocket)
            return TranscriptText(text)
        finally:
            close = getattr(websocket, "close", None)
            if callable(close):
                result = close()
                if asyncio.iscoroutine(result):
                    await result


async def _send_json(websocket: object, payload: object) -> None:
    send = getattr(websocket, "send")
    result = send(json.dumps(payload))
    if asyncio.iscoroutine(result):
        await result


async def _wait_for_transcript(websocket: object) -> str:
    recv = getattr(websocket, "recv")
    while True:
        raw = recv()
        if asyncio.iscoroutine(raw):
            raw = await raw
        if not isinstance(raw, str):
            continue
        text = transcript_from_event(parse_event_message(raw))
        if text is not None:
            return text
