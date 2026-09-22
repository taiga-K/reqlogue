from typing import Protocol

from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch
from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate
from reqlogue_api.domain.requirements import RequirementsSource, SectionDrafts


class MindmapGenerator(Protocol):
    async def generate(self, update: MindmapUpdate) -> MindmapTurn: ...


class AdviceAnalyzer(Protocol):
    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch: ...


class RequirementsDrafter(Protocol):
    async def draft(self, source: RequirementsSource) -> SectionDrafts: ...
