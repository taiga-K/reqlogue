from reqlogue_api.domain.requirements import (
    RequirementsSource,
    SectionDrafts,
    assemble_markdown,
)

STUB_DRAFTS = SectionDrafts(
    title="要件定義書",
    bodies={
        "overview": "スタブの概要です。",
        "scope": "スタブのスコープです。",
        "business_flow": "スタブの業務フローです。",
        "functional": "スタブの機能要件です。",
        "non_functional": "スタブの非機能要件です。",
        "open_issues": "スタブの未決事項です。",
        "changelog": "スタブの変更履歴です。",
    },
)

STUB_REQUIREMENTS = assemble_markdown("", STUB_DRAFTS)


class StubRequirementsDrafter:
    async def draft(self, source: RequirementsSource) -> SectionDrafts:
        del source
        return STUB_DRAFTS
