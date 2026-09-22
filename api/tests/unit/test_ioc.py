import pytest

from reqlogue_api.infrastructure.orcarouter_advice import OrcaRouterAdviceAnalyzer
from reqlogue_api.infrastructure.orcarouter_mindmap import OrcaRouterMindmapGenerator
from reqlogue_api.infrastructure.orcarouter_requirements import (
    OrcaRouterRequirementsDrafter,
)
from reqlogue_api.infrastructure.stub_advice import StubAdviceAnalyzer
from reqlogue_api.infrastructure.stub_mindmap import StubMindmapGenerator
from reqlogue_api.infrastructure.stub_requirements import StubRequirementsDrafter
from reqlogue_api.main.config import Settings
from reqlogue_api.main.ioc import (
    build_advice_analyzer,
    build_mindmap_generator,
    build_requirements_drafter,
)


def settings(mindmap: str, orcarouter_api_key: str = "") -> Settings:
    return Settings(
        orcarouter_api_key=orcarouter_api_key,
        mindmap=mindmap,
        cors_origins=("http://127.0.0.1:3000",),
    )


def test_stub_and_orcarouter_mindmap_are_selected_explicitly() -> None:
    stub = build_mindmap_generator(settings("stub"))
    live = build_mindmap_generator(settings("orcarouter", "orca-key"))
    assert isinstance(stub, StubMindmapGenerator)
    assert isinstance(live, OrcaRouterMindmapGenerator)


def test_unknown_mindmap_is_rejected() -> None:
    with pytest.raises(RuntimeError, match="Unsupported mindmap: missing"):
        build_mindmap_generator(settings("missing"))


def test_stub_and_orcarouter_advice_follow_the_mindmap_mode() -> None:
    stub = build_advice_analyzer(settings("stub"))
    live = build_advice_analyzer(settings("orcarouter", "orca-key"))
    assert isinstance(stub, StubAdviceAnalyzer)
    assert isinstance(live, OrcaRouterAdviceAnalyzer)


def test_orcarouter_advice_requires_key() -> None:
    with pytest.raises(RuntimeError, match="ORCAROUTER_API_KEY"):
        build_advice_analyzer(settings("orcarouter"))


def test_requirements_drafter_follows_the_mindmap_mode() -> None:
    stub = build_requirements_drafter(settings("stub"))
    live = build_requirements_drafter(settings("orcarouter", "orca-key"))
    assert isinstance(stub, StubRequirementsDrafter)
    assert isinstance(live, OrcaRouterRequirementsDrafter)
    with pytest.raises(RuntimeError, match="ORCAROUTER_API_KEY"):
        build_requirements_drafter(settings("orcarouter"))


def test_orcarouter_mindmap_requires_key() -> None:
    with pytest.raises(RuntimeError, match="ORCAROUTER_API_KEY"):
        build_mindmap_generator(settings("orcarouter"))
