from typing import Protocol

from reqlogue_api.domain.transcript import TranscriptText


class Transcriber(Protocol):
    async def transcribe(self, pcm16_mono_24k: bytes) -> TranscriptText: ...
