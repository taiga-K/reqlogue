import pytest

from reqlogue_api.application.update_mindmap import update_mindmap
from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.infrastructure.stub_mindmap import STUB_MINDMAP, StubMindmapGenerator


@pytest.mark.asyncio
async def test_empty_delta_keeps_previous_markdown() -> None:
    result = await update_mindmap(
        StubMindmapGenerator(),
        MindmapUpdate(
            meeting_id="meet-1",
            previous_markdown="# 会議\n\n- 残す",
            transcript_delta="   ",
        ),
    )
    assert result == MindmapMarkdown("# 会議\n\n- 残す")


@pytest.mark.asyncio
async def test_stub_returns_complete_markdown() -> None:
    result = await update_mindmap(
        StubMindmapGenerator(),
        MindmapUpdate(
            meeting_id="meet-1",
            previous_markdown="",
            transcript_delta="ログインはメールで",
        ),
    )
    assert result == MindmapMarkdown(STUB_MINDMAP)
