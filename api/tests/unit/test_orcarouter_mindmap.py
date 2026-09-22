import json

import pytest

from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate
from reqlogue_api.infrastructure.orcarouter_mindmap import (
    MEETING_SUPPORT_LITE,
    ORCAROUTER_CHAT_URL,
    SYSTEM_PROMPT,
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
    system = messages[0]
    assert isinstance(system, dict)
    assert system["content"] == SYSTEM_PROMPT
    assert "要件の対象となる具体的な「名詞」" in SYSTEM_PROMPT
    assert "同じ段に並べて切り離しません" in SYSTEM_PROMPT
    assert "依頼・願望の述語動詞" in SYSTEM_PROMPT
    user = messages[1]
    assert isinstance(user, dict)
    assert user["content"] == (
        "次の文字起こしから、要件の対象を親にし、性質や条件を子にした"
        "マインドマップの Markdown を作ってください。"
        "「見てほしい」「できれば」などの依頼動詞・クッション言葉・無意味な断片は除外してください。\n\n"
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
        "これまでの枝は、新しい発話が否定しない限り残してください。"
        "新しい発話から要件の対象や詳細を抽出し、適切な枝に追加または第1階層の枝を足してください。"
        "質問に回答があった場合は、選ばれた内容を反映してください。"
        "「見てほしい」「できれば」などの依頼動詞・クッション言葉・無意味な断片は枝に含めないでください。\n\n"
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
