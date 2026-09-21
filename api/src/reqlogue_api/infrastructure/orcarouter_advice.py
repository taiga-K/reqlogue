import json
from collections.abc import Awaitable, Callable

import httpx

from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch, AdviceItem
from reqlogue_api.infrastructure.advice_system_prompt import SYSTEM_PROMPT
from reqlogue_api.infrastructure.orcarouter_mindmap import (
    MEETING_SUPPORT_LITE,
    ORCAROUTER_CHAT_URL,
)

MAX_ITEMS = 2
PostJson = Callable[[str, dict[str, str], bytes], Awaitable[tuple[int, str]]]


class AdviceGenerateError(Exception):
    pass


async def _post_json(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, content=body)
        return response.status_code, response.text


def user_content(transcript_delta: str, notified_themes: tuple[str, ...]) -> str:
    if len(notified_themes) == 0:
        listed = "（なし）"
    else:
        listed = "\n".join(f"- {theme}" for theme in notified_themes)
    return (
        "通知済みテーマ一覧:\n"
        f"{listed}\n\n"
        "会話ログ:\n"
        f"{transcript_delta}\n\n"
        "出力は JSON のみ。"
        '{"items":[{"title":"","reason":"","suggested_question":"","quote":""}]}'
    )


def strip_fence(content: str) -> str:
    text = content.strip()
    if not text.startswith("```"):
        return text
    lines = text.split("\n")
    body = lines[1:]
    if len(body) > 0 and body[-1].strip() == "```":
        body = body[:-1]
    return "\n".join(body).strip()


def items_from_chat(raw: str) -> tuple[AdviceItem, ...]:
    content = message_content(raw)
    payload = json_object(strip_fence(content))
    if not isinstance(payload, dict):
        raise AdviceGenerateError("invalid advice response")
    raw_items = payload.get("items")
    if not isinstance(raw_items, list):
        raise AdviceGenerateError("invalid advice response")
    items: list[AdviceItem] = []
    for raw_item in raw_items:
        item = parse_item(raw_item)
        if item is None:
            continue
        items.append(item)
        if len(items) == MAX_ITEMS:
            break
    return tuple(items)


def message_content(raw: str) -> str:
    try:
        payload: object = json.loads(raw)
    except json.JSONDecodeError as error:
        raise AdviceGenerateError("invalid advice response") from error
    if not isinstance(payload, dict):
        raise AdviceGenerateError("invalid advice response")
    choices = payload.get("choices")
    if not isinstance(choices, list) or len(choices) == 0:
        raise AdviceGenerateError("invalid advice response")
    first = choices[0]
    if not isinstance(first, dict):
        raise AdviceGenerateError("invalid advice response")
    message = first.get("message")
    if not isinstance(message, dict):
        raise AdviceGenerateError("invalid advice response")
    content = message.get("content")
    if not isinstance(content, str):
        raise AdviceGenerateError("invalid advice response")
    return content


def json_object(text: str) -> object:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise AdviceGenerateError("invalid advice response") from None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError as error:
            raise AdviceGenerateError("invalid advice response") from error


def parse_item(value: object) -> AdviceItem | None:
    if not isinstance(value, dict):
        return None
    title = required_text(value.get("title"))
    reason = required_text(value.get("reason"))
    question = required_text(value.get("suggested_question"))
    quote = required_text(value.get("quote"))
    if title is None or reason is None or question is None or quote is None:
        return None
    return AdviceItem(title, reason, question, quote)


def required_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if text == "":
        return None
    return text


class OrcaRouterAdviceAnalyzer:
    def __init__(self, api_key: str, post: PostJson = _post_json) -> None:
        self._api_key = api_key
        self._post = post

    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch:
        body = json.dumps(
            {
                "model": MEETING_SUPPORT_LITE,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": user_content(
                            analysis.transcript_delta,
                            analysis.notified_themes,
                        ),
                    },
                ],
            },
            ensure_ascii=False,
        ).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "X-OrcaRouter-Session-Id": analysis.meeting_id,
        }
        status, raw = await self._post(ORCAROUTER_CHAT_URL, headers, body)
        if status >= 400:
            raise AdviceGenerateError("advice unavailable")
        return AdviceBatch(items_from_chat(raw))
