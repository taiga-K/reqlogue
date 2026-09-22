from typing import Protocol

from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch
from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.domain.transcript import AudioTurn, TranscriptText


class Transcriber(Protocol):
    async def transcribe(self, turn: AudioTurn) -> TranscriptText: ...


class MindmapGenerator(Protocol):
    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown: ...


class AdviceAnalyzer(Protocol):
    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch: ...
