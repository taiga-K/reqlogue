from typing import Protocol

from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.domain.transcript import TranscriptText


class Transcriber(Protocol):
    async def transcribe(self, pcm16_mono_24k: bytes) -> TranscriptText: ...


class MindmapGenerator(Protocol):
    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown: ...
