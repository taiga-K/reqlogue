from reqlogue_api.application.ports import (
    AdviceAnalyzer,
    MindmapGenerator,
    RequirementsDrafter,
)
from reqlogue_api.infrastructure.orcarouter_advice import OrcaRouterAdviceAnalyzer
from reqlogue_api.infrastructure.orcarouter_mindmap import OrcaRouterMindmapGenerator
from reqlogue_api.infrastructure.orcarouter_requirements import (
    OrcaRouterRequirementsDrafter,
)
from reqlogue_api.infrastructure.stub_advice import StubAdviceAnalyzer
from reqlogue_api.infrastructure.stub_mindmap import StubMindmapGenerator
from reqlogue_api.infrastructure.stub_requirements import StubRequirementsDrafter
from reqlogue_api.main.config import Settings


def build_mindmap_generator(settings: Settings) -> MindmapGenerator:
    if settings.mindmap == "orcarouter":
        if settings.orcarouter_api_key == "":
            raise RuntimeError(
                "ORCAROUTER_API_KEY is required for the orcarouter mindmap"
            )
        return OrcaRouterMindmapGenerator(settings.orcarouter_api_key)
    if settings.mindmap == "stub":
        return StubMindmapGenerator()
    raise RuntimeError(f"Unsupported mindmap: {settings.mindmap}")


def build_requirements_drafter(settings: Settings) -> RequirementsDrafter:
    if settings.mindmap == "orcarouter":
        if settings.orcarouter_api_key == "":
            raise RuntimeError(
                "ORCAROUTER_API_KEY is required for the orcarouter requirements drafter"
            )
        return OrcaRouterRequirementsDrafter(settings.orcarouter_api_key)
    if settings.mindmap == "stub":
        return StubRequirementsDrafter()
    raise RuntimeError(f"Unsupported mindmap: {settings.mindmap}")


def build_advice_analyzer(settings: Settings) -> AdviceAnalyzer:
    if settings.mindmap == "orcarouter":
        if settings.orcarouter_api_key == "":
            raise RuntimeError(
                "ORCAROUTER_API_KEY is required for the orcarouter advice analyzer"
            )
        return OrcaRouterAdviceAnalyzer(settings.orcarouter_api_key)
    if settings.mindmap == "stub":
        return StubAdviceAnalyzer()
    raise RuntimeError(f"Unsupported mindmap: {settings.mindmap}")
