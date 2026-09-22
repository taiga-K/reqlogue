import asyncio
import contextlib
import json

from fastapi import WebSocket, WebSocketDisconnect

from reqlogue_api.application.ports import Transcriber, TranscriptionSession


def origin_allowed(origin: str | None, allowed: tuple[str, ...]) -> bool:
    if origin is None or origin == "":
        return True
    return origin in allowed


def _payload(raw: str) -> dict[str, object] | None:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(value, dict):
        return value
    return None


def _kind(payload: dict[str, object]) -> str | None:
    kind = payload.get("type")
    if isinstance(kind, str):
        return kind
    return None


def _overview_text(payload: dict[str, object]) -> str:
    overview = payload.get("overview")
    if isinstance(overview, str):
        return overview.strip()
    return ""


async def stream_transcription(
    websocket: WebSocket,
    transcriber: Transcriber,
    allowed_origins: tuple[str, ...],
) -> None:
    if not origin_allowed(websocket.headers.get("origin"), allowed_origins):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    try:
        opened = await _open_live_session(websocket, transcriber)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close(code=1011)
        return
    if opened is None:
        with contextlib.suppress(Exception):
            await websocket.close(code=1000)
        return
    session, pending_pcm = opened

    sender = asyncio.create_task(_send_deltas(websocket, session))
    failed = False
    try:
        for chunk in pending_pcm:
            await session.append(chunk)
        while True:
            receive = asyncio.create_task(websocket.receive())
            done, _pending = await asyncio.wait(
                {receive, sender},
                return_when=asyncio.FIRST_COMPLETED,
            )
            if sender in done and receive not in done:
                receive.cancel()
                failed = True
                break
            try:
                message = receive.result()
            except WebSocketDisconnect:
                break
            if message["type"] == "websocket.disconnect":
                break
            raw_text = message.get("text")
            if isinstance(raw_text, str) and _kind(_payload(raw_text) or {}) == "stop":
                break
            pcm = message.get("bytes")
            if isinstance(pcm, bytes) and len(pcm) > 0:
                await session.append(pcm)
    except WebSocketDisconnect:
        pass
    finally:
        await session.close()
        if sender.done():
            failed = failed or sender.exception() is not None
        else:
            with contextlib.suppress(Exception):
                await sender
            failed = sender.exception() is not None
        with contextlib.suppress(Exception):
            await websocket.close(code=1011 if failed else 1000)


async def _open_live_session(
    websocket: WebSocket,
    transcriber: Transcriber,
) -> tuple[TranscriptionSession, list[bytes]] | None:
    while True:
        message = await websocket.receive()
        if message["type"] == "websocket.disconnect":
            return None
        raw_text = message.get("text")
        if isinstance(raw_text, str):
            payload = _payload(raw_text) or {}
            kind = _kind(payload)
            if kind == "stop":
                return None
            overview = _overview_text(payload) if kind == "overview" else ""
            session = await transcriber.open_session(overview)
            return session, []
        pcm = message.get("bytes")
        if isinstance(pcm, bytes) and len(pcm) > 0:
            session = await transcriber.open_session("")
            return session, [pcm]


async def _send_deltas(websocket: WebSocket, session: TranscriptionSession) -> None:
    async for transcript in session:
        if transcript.value.strip() == "":
            continue
        await websocket.send_json({"text": transcript.value})
