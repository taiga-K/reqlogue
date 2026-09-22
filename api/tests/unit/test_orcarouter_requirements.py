import json

import pytest

from reqlogue_api.domain.requirements import Detection, RequirementsSource
from reqlogue_api.infrastructure.orcarouter_mindmap import ORCAROUTER_CHAT_URL
from reqlogue_api.infrastructure.orcarouter_requirements import (
    REQUIREMENTS_QUALITY,
    OrcaRouterRequirementsDrafter,
    user_prompt,
)
from reqlogue_api.infrastructure.requirements_system_prompt import SYSTEM_PROMPT


def chat_body(content: str) -> str:
    return json.dumps({"choices": [{"message": {"content": content}}]})


@pytest.mark.asyncio
async def test_requirements_call_uses_the_quality_router() -> None:
    captured: dict[str, object] = {}

    async def post(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body(
            json.dumps(
                {
                    "title": "要件定義書",
                    "overview": "ログインはメール。",
                    "scope": "",
                    "business_flow": "",
                    "functional": "",
                    "non_functional": "",
                    "open_issues": "",
                    "changelog": "",
                },
                ensure_ascii=False,
            )
        )

    source = RequirementsSource(
        meeting_id="meet-9",
        meeting_name="新サービス",
        utterances=("ログインはメールでやりたい",),
        detections=(
            Detection(
                title="数量の上限",
                reason="未定",
                suggested_question="上限は決めますか？",
                quote="数量の上限",
                column="advice",
            ),
        ),
    )
    drafts = await OrcaRouterRequirementsDrafter("orca-key", post).draft(source)
    assert drafts.title == "要件定義書"
    assert drafts.bodies["overview"] == "ログインはメール。"
    assert captured["url"] == ORCAROUTER_CHAT_URL
    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers["Authorization"] == "Bearer orca-key"
    assert headers["X-OrcaRouter-Session-Id"] == "meet-9"
    payload = captured["body"]
    assert isinstance(payload, dict)
    assert payload["model"] == REQUIREMENTS_QUALITY
    assert payload["model"] != "orcarouter/meeting-support-lite"
    assert "temperature" not in payload
    messages = payload["messages"]
    assert isinstance(messages, list)
    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    user = messages[1]
    assert isinstance(user, dict)
    assert user["content"] == user_prompt(source)
    assert "<<<UNTRUSTED_TRANSCRIPT_START>>>" in str(user["content"])
    assert "ログインはメールでやりたい" in str(user["content"])
    assert "[未対応] 数量の上限" in str(user["content"])
