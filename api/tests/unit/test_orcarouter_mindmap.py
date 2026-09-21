import json

import pytest

from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.infrastructure.orcarouter_mindmap import (
    MEETING_SUPPORT_LITE,
    ORCAROUTER_CHAT_URL,
    OrcaRouterMindmapGenerator,
    markdown_from_chat,
    strip_fence,
)


def chat_body(markdown: str) -> str:
    return json.dumps(
        {
            "choices": [
                {"message": {"content": markdown}},
            ]
        }
    )


@pytest.mark.asyncio
async def test_first_call_sends_delta_without_previous_map() -> None:
    captured: dict[str, object] = {}

    async def post(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body("# 会議\n\n- ログイン")

    result = await OrcaRouterMindmapGenerator("orca-key", post).generate(
        MindmapUpdate(
            meeting_id="meet-9",
            previous_markdown="",
            transcript_delta="ログインはメールでやりたい",
        )
    )
    assert result == MindmapMarkdown("# 会議\n\n- ログイン")
    assert captured["url"] == ORCAROUTER_CHAT_URL
    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers["Authorization"] == "Bearer orca-key"
    assert headers["X-OrcaRouter-Session-Id"] == "meet-9"
    payload = captured["body"]
    assert isinstance(payload, dict)
    assert payload["model"] == MEETING_SUPPORT_LITE
    messages = payload["messages"]
    assert isinstance(messages, list)
    user = messages[1]
    assert isinstance(user, dict)
    assert user["content"] == (
        "次の文字起こしからマインドマップの Markdown を作ってください。\n\n"
        "ログインはメールでやりたい"
    )
    assert "前回のマインドマップ" not in str(user["content"])


@pytest.mark.asyncio
async def test_later_call_sends_previous_markdown_and_new_speech_only() -> None:
    captured: dict[str, object] = {}

    async def post(_url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body("# 会議\n\n- ログイン\n- パスワード")

    result = await OrcaRouterMindmapGenerator("orca-key", post).generate(
        MindmapUpdate(
            meeting_id="meet-9",
            previous_markdown="# 会議\n\n- ログイン",
            transcript_delta="パスワードも必要",
        )
    )
    assert result == MindmapMarkdown("# 会議\n\n- ログイン\n- パスワード")
    payload = captured["body"]
    assert isinstance(payload, dict)
    user = payload["messages"][1]
    assert user["content"] == (
        "前回のマインドマップ Markdown です。"
        "既存の見出しと文言は維持してください。"
        "新しい発話だけを該当する枝へ足し、訂正はその枝だけ直し、"
        "話題が変わったら最上段の見出しを足してください。\n\n"
        "# 会議\n\n- ログイン\n\n"
        "新しい発話:\nパスワードも必要"
    )
    assert "ログインはメール" not in str(user["content"])
    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers["X-OrcaRouter-Session-Id"] == "meet-9"


def test_markdown_strips_a_fence_and_rejects_empty_content() -> None:
    fenced = chat_body("```markdown\n# 会議\n\n- 枝\n```")
    assert markdown_from_chat(fenced) == "# 会議\n\n- 枝"
    with pytest.raises(Exception, match="invalid mindmap response"):
        markdown_from_chat(chat_body("   "))
    with pytest.raises(Exception, match="invalid mindmap response"):
        markdown_from_chat(chat_body("```markdown\n```"))
    assert strip_fence("# 会議") == "# 会議"
