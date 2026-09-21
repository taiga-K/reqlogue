from reqlogue_api.application.ports import MindmapGenerator
from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate


async def update_mindmap(
    generator: MindmapGenerator,
    update: MindmapUpdate,
) -> MindmapMarkdown:
    if update.transcript_delta.strip() == "":
        return MindmapMarkdown(update.previous_markdown)
    return await generator.generate(update)
