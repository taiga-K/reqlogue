import pytest

from reqlogue_api.application.generate_requirements import generate_requirements
from reqlogue_api.domain.requirements import (
    EMPTY_SECTION,
    RequirementsSource,
    SectionDrafts,
)


class BoomDrafter:
    async def draft(self, source: RequirementsSource) -> SectionDrafts:
        del source
        raise AssertionError("empty meeting must not call the drafter")


class FixedDrafter:
    async def draft(self, source: RequirementsSource) -> SectionDrafts:
        del source
        return SectionDrafts(
            title="新サービス",
            bodies={"overview": "# 背景", "scope": ""},
        )


@pytest.mark.asyncio
async def test_empty_meeting_is_a_placeholder_document_without_the_model() -> None:
    document = await generate_requirements(
        BoomDrafter(),
        RequirementsSource(
            meeting_id="meet-1",
            meeting_name="新サービス",
            utterances=(),
            detections=(),
        ),
    )
    assert document.value.startswith("# 新サービス 要件定義書\n")
    assert "## 1. プロジェクト/会議概要・背景・ゴール\n\n" + EMPTY_SECTION in (
        document.value
    )
    assert "## 7. 発話ログ要約・変更履歴\n\n" + EMPTY_SECTION in document.value


@pytest.mark.asyncio
async def test_model_sections_keep_fixed_headings_and_demote_inner_titles() -> None:
    document = await generate_requirements(
        FixedDrafter(),
        RequirementsSource(
            meeting_id="meet-1",
            meeting_name="新サービス",
            utterances=("ログインはメールでやりたい",),
            detections=(),
        ),
    )
    assert document.value.startswith("# 新サービス\n")
    assert "### 背景" in document.value
    assert "## 2. スコープ（対象範囲・対象外範囲）\n\n" + EMPTY_SECTION in (
        document.value
    )
