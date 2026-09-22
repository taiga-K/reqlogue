import asyncio
import base64
import json
from collections.abc import AsyncIterator, Awaitable, Callable

from reqlogue_api.domain.transcript import AudioTurn, TranscriptText
from reqlogue_api.infrastructure.openai_events import (
    delta_from_event,
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


def session_update_event(overview: str, *, live: bool = False) -> SessionUpdate:
    transcription: dict[str, object] = {
        "model": LIVE_TRANSCRIBE_MODEL,
        "languages": ["ja"],
    }
    if overview != "":
        transcription["prompt"] = overview
    turn_detection: dict[str, str] | None = {"type": "server_vad"} if live else None
    return {
        "type": "session.update",
        "session": {
            "type": "transcription",
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": 24000},
                    "transcription": transcription,
                    "turn_detection": turn_detection,
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
            await _close_socket(websocket)

    async def open_session(self, overview: str) -> "OpenAiLiveSession":
        headers = [f"Authorization: Bearer {self._api_key}"]
        websocket = await self._connect(OPENAI_REALTIME_URL, headers)
        await _send_json(websocket, session_update_event(overview, live=True))
        return OpenAiLiveSession(websocket)


class OpenAiLiveSession:
    def __init__(self, websocket: object) -> None:
        self._websocket = websocket
        self._uncommitted = 0
        self._delta_items: set[str] = set()
        self._closed = False
        self._tail = asyncio.Event()
        self._queue: asyncio.Queue[TranscriptText | Exception | None] = asyncio.Queue()
        self._reader = asyncio.create_task(self._read())

    async def append(self, pcm: bytes) -> None:
        if len(pcm) == 0 or self._closed:
            return
        self._uncommitted += len(pcm)
        await _send_json(
            self._websocket,
            {
                "type": "input_audio_buffer.append",
                "audio": base64.b64encode(pcm).decode("ascii"),
            },
        )

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            if self._uncommitted > 0:
                await _send_json(
                    self._websocket,
                    {"type": "input_audio_buffer.commit"},
                )
                try:
                    await asyncio.wait_for(self._tail.wait(), TRANSCRIPT_WAIT_SECONDS)
                except TimeoutError:
                    pass
        finally:
            self._reader.cancel()
            await _close_socket(self._websocket)
            await self._queue.put(None)

    def __aiter__(self) -> AsyncIterator[TranscriptText]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[TranscriptText]:
        while True:
            item = await self._queue.get()
            if item is None:
                return
            if isinstance(item, Exception):
                raise item
            yield item

    async def _read(self) -> None:
        recv = getattr(self._websocket, "recv")
        try:
            while True:
                raw = recv()
                if asyncio.iscoroutine(raw):
                    raw = await raw
                if not isinstance(raw, str):
                    continue
                payload = parse_event_message(raw)
                piece = self._piece(payload)
                if piece is not None:
                    await self._queue.put(TranscriptText(piece))
                if is_error_event(payload):
                    if not self._closed:
                        await self._queue.put(
                            TranscriptWaitError("transcription error")
                        )
                    self._tail.set()
                    return
                if self._closed and _is_completed(payload):
                    self._tail.set()
                    return
        except asyncio.CancelledError:
            raise
        except Exception as error:
            if not self._closed:
                await self._queue.put(error)
            self._tail.set()

    def _piece(self, payload: object) -> str | None:
        if _is_committed(payload) or _is_completed(payload):
            self._uncommitted = 0
        delta = delta_from_event(payload)
        if delta is not None:
            item_id = _item_id(payload)
            self._delta_items.add(item_id if item_id is not None else "")
            return delta
        text = transcript_from_event(payload)
        if text is None or text == "":
            return None
        item_id = _item_id(payload)
        key = item_id if item_id is not None else ""
        if key in self._delta_items:
            self._delta_items.discard(key)
            return None
        return text


def _item_id(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    item_id = payload.get("item_id")
    if isinstance(item_id, str):
        return item_id
    return None


def _is_completed(payload: object) -> bool:
    return isinstance(payload, dict) and payload.get("type") == (
        "conversation.item.input_audio_transcription.completed"
    )


def _is_committed(payload: object) -> bool:
    return isinstance(payload, dict) and payload.get("type") == (
        "input_audio_buffer.committed"
    )


async def _close_socket(websocket: object) -> None:
    close = getattr(websocket, "close", None)
    if not callable(close):
        return
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
