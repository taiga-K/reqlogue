import asyncio
import base64
import json
from collections.abc import Awaitable, Callable

from reqlogue_api.domain.transcript import AudioTurn, TranscriptText
from reqlogue_api.infrastructure.openai_events import (
    is_error_event,
    parse_event_message,
    transcript_from_event,
)

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription"
LIVE_TRANSCRIBE_MODEL = "gpt-live-transcribe"
TRANSCRIPT_WAIT_SECONDS = 15.0


class TranscriptWaitError(Exception):
    pass


SessionUpdate = dict[str, object]


def session_update_event(overview: str) -> SessionUpdate:
    transcription: dict[str, object] = {
        "model": LIVE_TRANSCRIBE_MODEL,
        "languages": ["ja"],
        "delay": "low",
    }
    if overview != "":
        transcription["prompt"] = overview
    return {
        "type": "session.update",
        "session": {
            "type": "transcription",
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": 24000},
                    "transcription": transcription,
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

    async def transcribe(self, turn: AudioTurn) -> TranscriptText:
        headers = [f"Authorization: Bearer {self._api_key}"]
        websocket = await self._connect(OPENAI_REALTIME_URL, headers)
        try:
            await _send_json(websocket, session_update_event(turn.overview))
            await _send_json(
                websocket,
                {
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(turn.pcm).decode("ascii"),
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
    try:
        async with asyncio.timeout(TRANSCRIPT_WAIT_SECONDS):
            while True:
                raw = recv()
                if asyncio.iscoroutine(raw):
                    raw = await raw
                if not isinstance(raw, str):
                    continue
                payload = parse_event_message(raw)
                if is_error_event(payload):
                    raise TranscriptWaitError("transcription error")
                text = transcript_from_event(payload)
                if text is not None:
                    return text
    except TimeoutError as error:
        raise TranscriptWaitError("transcription timed out") from error
