from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate

STUB_MINDMAP = "# 会議\n\n- 要件"
STUB_TRANSCRIPT = "stub transcript"


class StubMindmapGenerator:
    async def generate(self, update: MindmapUpdate) -> MindmapTurn:
        del update
        return MindmapTurn(markdown=STUB_MINDMAP, transcript=STUB_TRANSCRIPT)
