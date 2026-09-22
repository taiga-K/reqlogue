from typing import Protocol

from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch
from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.domain.requirements import RequirementsSource, SectionDrafts
from reqlogue_api.domain.transcript import TranscriptText


class Transcriber(Protocol):
    async def transcribe(self, pcm16_mono_24k: bytes) -> TranscriptText: ...


class MindmapGenerator(Protocol):
    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown: ...


class AdviceAnalyzer(Protocol):
    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch: ...


class RequirementsDrafter(Protocol):
    async def draft(self, source: RequirementsSource) -> SectionDrafts: ...
