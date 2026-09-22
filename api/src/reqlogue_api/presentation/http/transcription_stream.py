import asyncio
import contextlib

from fastapi import WebSocket, WebSocketDisconnect

from reqlogue_api.application.ports import Transcriber
from reqlogue_api.presentation.http.overview_header import parse_overview_header


def origin_allowed(origin: str | None, allowed: tuple[str, ...]) -> bool:
    if origin is None or origin == "":
        return True
    return origin in allowed


async def stream_transcription(
    websocket: WebSocket,
    transcriber: Transcriber,
    allowed_origins: tuple[str, ...],
) -> None:
    if not origin_allowed(websocket.headers.get("origin"), allowed_origins):
        await websocket.close(code=1008)
        return
    await websocket.accept()
    overview = parse_overview_header(websocket.query_params.get("overview"))
    try:
        session = await transcriber.open_session(overview)
    except Exception:
        await websocket.close(code=1011)
        return

    async def send_deltas() -> None:
        async for transcript in session:
            text = transcript.value.strip()
            if text == "":
                continue
            await websocket.send_json({"text": text})

    sender = asyncio.create_task(send_deltas())
    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            pcm = message.get("bytes")
            if isinstance(pcm, bytes) and len(pcm) > 0:
                await session.append(pcm)
    except WebSocketDisconnect:
        pass
    finally:
        await session.close()
        with contextlib.suppress(Exception):
            await sender
