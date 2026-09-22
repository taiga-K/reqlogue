from collections.abc import AsyncIterator
from typing import Protocol

from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch
from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.domain.requirements import RequirementsSource, SectionDrafts
from reqlogue_api.domain.transcript import AudioTurn, TranscriptText


class TranscriptionSession(Protocol):
    async def append(self, pcm: bytes) -> None: ...

    async def close(self) -> None: ...

    def __aiter__(self) -> AsyncIterator[TranscriptText]: ...


class Transcriber(Protocol):
    async def transcribe(self, turn: AudioTurn) -> TranscriptText: ...

    async def open_session(self, overview: str) -> TranscriptionSession: ...


class MindmapGenerator(Protocol):
    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown: ...


class AdviceAnalyzer(Protocol):
    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch: ...


class RequirementsDrafter(Protocol):
    async def draft(self, source: RequirementsSource) -> SectionDrafts: ...
