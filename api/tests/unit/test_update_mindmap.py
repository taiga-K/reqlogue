import pytest

from reqlogue_api.application.update_mindmap import update_mindmap
from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate
from reqlogue_api.infrastructure.stub_mindmap import (
    STUB_MINDMAP,
    STUB_TRANSCRIPT,
    StubMindmapGenerator,
)


def loud_pcm() -> bytes:
    return (8000).to_bytes(2, "little", signed=True) * 4


@pytest.mark.asyncio
async def test_silence_keeps_previous_markdown_and_skips_the_model() -> None:
    class Boom:
        async def generate(self, update: MindmapUpdate) -> MindmapTurn:
            del update
            raise AssertionError("silent audio must not call the model")

    result = await update_mindmap(
        Boom(),
        MindmapUpdate(
            meeting_id="meet-1",
            previous_markdown="# 会議\n\n- 残す",
            pcm16_mono_24k=b"\x00\x00" * 8,
        ),
    )
    assert result == MindmapTurn(markdown="# 会議\n\n- 残す", transcript="")


@pytest.mark.asyncio
async def test_stub_returns_transcript_and_markdown() -> None:
    result = await update_mindmap(
        StubMindmapGenerator(),
        MindmapUpdate(
            meeting_id="meet-1",
            previous_markdown="",
            pcm16_mono_24k=loud_pcm(),
        ),
    )
    assert result == MindmapTurn(markdown=STUB_MINDMAP, transcript=STUB_TRANSCRIPT)
