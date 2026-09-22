from reqlogue_api.application.ports import RequirementsDrafter
from reqlogue_api.domain.requirements import (
    RequirementsMarkdown,
    RequirementsSource,
    SectionDrafts,
    assemble_markdown,
)


async def generate_requirements(
    drafter: RequirementsDrafter,
    source: RequirementsSource,
) -> RequirementsMarkdown:
    has_speech = any(utterance.strip() != "" for utterance in source.utterances)
    if not has_speech and len(source.detections) == 0:
        empty = SectionDrafts(title="", bodies={})
        return RequirementsMarkdown(assemble_markdown(source.meeting_name, empty))
    drafts = await drafter.draft(source)
    return RequirementsMarkdown(assemble_markdown(source.meeting_name, drafts))
