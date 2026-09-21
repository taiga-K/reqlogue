import hashlib
import json

import pytest

from reqlogue_api.application.analyze_advice import analyze_advice
from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch, AdviceItem
from reqlogue_api.infrastructure.advice_system_prompt import SYSTEM_PROMPT
from reqlogue_api.infrastructure.orcarouter_advice import (
    OrcaRouterAdviceAnalyzer,
    items_from_chat,
)
from reqlogue_api.infrastructure.orcarouter_mindmap import (
    MEETING_SUPPORT_LITE,
    ORCAROUTER_CHAT_URL,
)
from reqlogue_api.infrastructure.stub_advice import STUB_ADVICE_ITEM, StubAdviceAnalyzer

PROMPT_SHA256 = "27322922705c837561d1fe77df57e035b75ad6041b1acd0d7977435defce71b0"


def test_system_prompt_is_the_copilot_instruction() -> None:
    digest = hashlib.sha256(SYSTEM_PROMPT.encode("utf-8")).hexdigest()
    assert digest == PROMPT_SHA256
    assert "items=[]" in SYSTEM_PROMPT


def chat_body(content: str) -> str:
    return json.dumps({"choices": [{"message": {"content": content}}]})


@pytest.mark.asyncio
async def test_empty_delta_skips_the_analyzer() -> None:
    result = await analyze_advice(
        StubAdviceAnalyzer(),
        AdviceAnalysis(
            meeting_id="meet-1",
            transcript_delta="   ",
            notified_themes=(),
        ),
    )
    assert result == AdviceBatch(())


@pytest.mark.asyncio
async def test_analysis_sends_the_prompt_delta_and_notified_themes() -> None:
    captured: dict[str, object] = {}

    async def post(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body('{"items":[]}')

    result = await OrcaRouterAdviceAnalyzer("orca-key", post).analyze(
        AdviceAnalysis(
            meeting_id="meet-9",
            transcript_delta="数量の上限が未定",
            notified_themes=("納期",),
        )
    )
    assert result == AdviceBatch(())
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
    user = messages[1]
    assert isinstance(system, dict)
    assert system["content"] == SYSTEM_PROMPT
    assert isinstance(user, dict)
    content = user["content"]
    assert isinstance(content, str)
    assert "通知済みテーマ一覧:\n- 納期" in content
    assert "数量の上限が未定" in content


def test_parser_keeps_at_most_two_items_and_accepts_an_empty_list() -> None:
    assert items_from_chat(chat_body('{"items":[]}')) == ()
    raw = chat_body(
        json.dumps(
            {
                "items": [
                    {
                        "title": "数量",
                        "reason": "上限がない",
                        "suggested_question": "上限はありますか？",
                        "quote": "数量の上限",
                    },
                    {
                        "title": "納期",
                        "reason": "日付がない",
                        "suggested_question": "いつまでですか？",
                        "quote": "納期",
                    },
                    {
                        "title": "担当",
                        "reason": "人がいない",
                        "suggested_question": "誰がですか？",
                        "quote": "担当者",
                    },
                    {
                        "title": " ",
                        "reason": "x",
                        "suggested_question": "y",
                        "quote": "z",
                    },
                ]
            },
            ensure_ascii=False,
        )
    )
    assert items_from_chat(raw) == (
        AdviceItem("数量", "上限がない", "上限はありますか？", "数量の上限"),
        AdviceItem("納期", "日付がない", "いつまでですか？", "納期"),
    )


def test_parser_strips_a_json_fence_on_one_line_or_many() -> None:
    body = '{"items":[]}'
    assert items_from_chat(chat_body(f"```json {body} ```")) == ()
    assert items_from_chat(chat_body(f"```json\n{body}\n```")) == ()


def test_stub_item_is_one_card() -> None:
    assert STUB_ADVICE_ITEM.title == "確認したい点"
