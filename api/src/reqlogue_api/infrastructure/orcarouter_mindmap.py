import json
from collections.abc import Awaitable, Callable

import httpx

from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate

ORCAROUTER_CHAT_URL = "https://api.orcarouter.ai/v1/chat/completions"
MEETING_SUPPORT_LITE = "orcarouter/meeting-support-lite"
SYSTEM_PROMPT = (
    "あなたは要件定義ヒアリングのマインドマップ編集者です。"
    "毎回 markmap 用の完全な Markdown 文書だけを返してください。"
    "コードフェンスは付けないでください。"
    "既存の見出しと文言は維持し、新しい発話は該当する枝へ足し、"
    "訂正はその枝だけ直し、話題が変わったら最上段の見出しを足してください。"
    "ノードの差分パッチは出さないでください。"
)

PostJson = Callable[[str, dict[str, str], bytes], Awaitable[tuple[int, str]]]


class MindmapGenerateError(Exception):
    pass


async def _post_json(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, content=body)
        return response.status_code, response.text


def user_prompt(previous_markdown: str, transcript_delta: str) -> str:
    if previous_markdown == "":
        return (
            "次の文字起こしからマインドマップの Markdown を作ってください。\n\n"
            f"{transcript_delta}"
        )
    return (
        "前回のマインドマップ Markdown です。"
        "既存の見出しと文言は維持してください。"
        "新しい発話だけを該当する枝へ足し、訂正はその枝だけ直し、"
        "話題が変わったら最上段の見出しを足してください。\n\n"
        f"{previous_markdown}\n\n"
        f"新しい発話:\n{transcript_delta}"
    )


def markdown_from_chat(raw: str) -> str:
    try:
        payload: object = json.loads(raw)
    except json.JSONDecodeError as error:
        raise MindmapGenerateError("invalid mindmap response") from error
    if not isinstance(payload, dict):
        raise MindmapGenerateError("invalid mindmap response")
    choices = payload.get("choices")
    if not isinstance(choices, list) or len(choices) == 0:
        raise MindmapGenerateError("invalid mindmap response")
    first = choices[0]
    if not isinstance(first, dict):
        raise MindmapGenerateError("invalid mindmap response")
    message = first.get("message")
    if not isinstance(message, dict):
        raise MindmapGenerateError("invalid mindmap response")
    content = message.get("content")
    if not isinstance(content, str) or content.strip() == "":
        raise MindmapGenerateError("invalid mindmap response")
    return strip_fence(content)


def strip_fence(content: str) -> str:
    text = content.strip()
    if not text.startswith("```"):
        return text
    lines = text.split("\n")
    body = lines[1:]
    if len(body) > 0 and body[-1].strip() == "```":
        body = body[:-1]
    return "\n".join(body).strip()


class OrcaRouterMindmapGenerator:
    def __init__(
        self,
        api_key: str,
        post: PostJson = _post_json,
    ) -> None:
        self._api_key = api_key
        self._post = post

    async def generate(self, update: MindmapUpdate) -> MindmapMarkdown:
        body = json.dumps(
            {
                "model": MEETING_SUPPORT_LITE,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": user_prompt(
                            update.previous_markdown,
                            update.transcript_delta,
                        ),
                    },
                ],
            },
            ensure_ascii=False,
        ).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "X-OrcaRouter-Session-Id": update.meeting_id,
        }
        status, raw = await self._post(ORCAROUTER_CHAT_URL, headers, body)
        if status >= 400:
            raise MindmapGenerateError("mindmap unavailable")
        return MindmapMarkdown(markdown_from_chat(raw))
