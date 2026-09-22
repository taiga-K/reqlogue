import asyncio
import contextlib
import json

from fastapi import WebSocket, WebSocketDisconnect

from reqlogue_api.application.ports import Transcriber, TranscriptionSession


def origin_allowed(origin: str | None, allowed: tuple[str, ...]) -> bool:
    if origin is None or origin == "":
        return True
    return origin in allowed


def _is_stop(raw: str) -> bool:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return False
    return isinstance(payload, dict) and payload.get("type") == "stop"


async def stream_transcription(
    websocket: WebSocket,
    transcriber: Transcriber,
    allowed_origins: tuple[str, ...],
) -> None:
    if not origin_allowed(websocket.headers.get("origin"), allowed_origins):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    overview = websocket.query_params.get("overview", "").strip()
    try:
        session = await transcriber.open_session(overview)
    except Exception:
        await websocket.close(code=1011)
        return

    sender = asyncio.create_task(_send_deltas(websocket, session))
    failed = False
    try:
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
            if isinstance(raw_text, str) and _is_stop(raw_text):
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


async def _send_deltas(websocket: WebSocket, session: TranscriptionSession) -> None:
    async for transcript in session:
        if transcript.value.strip() == "":
            continue
        await websocket.send_json({"text": transcript.value})
