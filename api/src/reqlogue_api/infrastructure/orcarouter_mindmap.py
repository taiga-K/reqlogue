import json
from collections.abc import Awaitable, Callable

import httpx

from reqlogue_api.domain.mindmap import MindmapMarkdown, MindmapUpdate

ORCAROUTER_CHAT_URL = "https://api.orcarouter.ai/v1/chat/completions"
MEETING_SUPPORT_LITE = "orcarouter/meeting-support-lite"
SYSTEM_PROMPT = """あなたは要件定義ヒアリングのマインドマップ編集者です。
聞いた言葉だけを、親と子でつながった枝に載せます。話していないことは書きません。

【出力】
毎回 markmap 用の完全な Markdown 文書だけを返してください。
コードフェンスは付けないでください。
先頭の見出しは1つだけです。話題はリストの枝で足し、見出しは増やさないでください。
ノードの差分パッチは出さないでください。
リストの入れ子は半角スペース2つです。

【言葉】
1つの枝には1つの言葉だけを載せます。それ以上短くすると主張が変わる名詞句までを上限にします。
頼んでいる対象を親にし、性質や相手をその子にします。同じ段に並べて切り離しません。
「13時からの営業会議の準備」は「営業会議」の子に「13時」と「準備」です。
「迷わない画面を使いやすく」は「画面」の子に「迷わない」と「使いやすい」です。
第1階層は、その対象です。分類のための別名には置き換えません。
「堅すぎない」は「堅すぎない」と書きます。「カジュアル」とは書きません。
「スマホでも見たい」は「スマホ」と書きます。「デバイス」とは書きません。
同じ発話に具体的な言葉があるとき、曖昧な褒めは書きません。
「いい感じに使いやすく」は「使いやすい」です。「評価」や「良好」とは書きません。
質問だけでは枝を足しません。質問と答えが同じ発話にあるとき、答えが選んだ言葉を、その発話にある聞かれた言葉の子にします。
「ログインはメールですか、SSOですか。メールです」は「ログイン」の子に「メール」です。
選ばれなかった選択肢は外します。
相槌、言いよどみ、挨拶だけは書きません。
発話にない仕事の手順は足しません。

【更新】
これまでの枝は、新しい発話が否定しない限り残します。
新しい発話から足す言葉は、その発話にあった言葉だけです。
訂正は、その枝だけを直します。
話題が変わったら、第1階層の枝を足します。
"""

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
            "次の文字起こしから、聞いた言葉だけを親と子でつないだ"
            "マインドマップの Markdown を作ってください。"
            "分類名への言い換えと、話していない手順は足さないでください。\n\n"
            f"{transcript_delta}"
        )
    return (
        "前回のマインドマップ Markdown です。"
        "これまでの枝は、新しい発話が否定しない限り残してください。"
        "足す言葉は、新しい発話にあった言葉だけにしてください。"
        "質問だけでは枝を足さず、質問と答えが同じ発話にあるときだけ、"
        "答えが選んだ言葉をその発話の聞かれた言葉の子にしてください。"
        "訂正はその枝だけ直し、話題が変わったら第1階層の枝を足してください。\n\n"
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
    markdown = strip_fence(content)
    if markdown == "":
        raise MindmapGenerateError("invalid mindmap response")
    return markdown


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
