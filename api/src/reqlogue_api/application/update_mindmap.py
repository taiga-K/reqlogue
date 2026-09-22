from reqlogue_api.application.ports import MindmapGenerator
from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate, is_silent_pcm


async def update_mindmap(
    generator: MindmapGenerator,
    update: MindmapUpdate,
) -> MindmapTurn:
    if is_silent_pcm(update.pcm16_mono_24k):
        return MindmapTurn(markdown=update.previous_markdown, transcript="")
    return await generator.generate(update)
