from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate

STUB_MINDMAP = "# 会議\n\n- 要件"


class StubMindmapGenerator:
    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown:
        del update
        return MindmapMarkdown(STUB_MINDMAP)
