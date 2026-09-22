import asyncio
from collections.abc import AsyncIterator

from reqlogue_api.domain.transcript import AudioTurn, TranscriptText

STUB_TRANSCRIPT = "stub transcript"


class StubTranscriptionSession:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[TranscriptText | None] = asyncio.Queue()
        self._emitted = False

    async def append(self, pcm: bytes) -> None:
        if len(pcm) == 0 or self._emitted:
            return
        self._emitted = True
        await self._queue.put(TranscriptText(STUB_TRANSCRIPT))

    async def close(self) -> None:
        await self._queue.put(None)

    def __aiter__(self) -> AsyncIterator[TranscriptText]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[TranscriptText]:
        while True:
            item = await self._queue.get()
            if item is None:
                return
            yield item


class StubTranscriber:
    async def transcribe(self, turn: AudioTurn) -> TranscriptText:
        del turn
        return TranscriptText(STUB_TRANSCRIPT)

    async def open_session(self, overview: str) -> StubTranscriptionSession:
        del overview
        return StubTranscriptionSession()
