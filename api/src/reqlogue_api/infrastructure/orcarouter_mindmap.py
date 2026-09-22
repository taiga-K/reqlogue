import base64
import json
import struct
from collections.abc import Awaitable, Callable

import httpx

from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate

ORCAROUTER_CHAT_URL = "https://api.orcarouter.ai/v1/chat/completions"
GEMINI_FLASH = "google/gemini-3.8-flash"
MEETING_SUPPORT_LITE = "orcarouter/meeting-support-lite"
PCM_RATE = 24_000
REQUEST_TIMEOUT_SECONDS = 60.0
SYSTEM_PROMPT = """あなたは要件定義ヒアリングのマインドマップ編集者です。
会話から要件の対象とその詳細を抽出し、markmap で
視覚的に理解しやすいマインドマップの Markdown を作成・更新します。
聞いた言葉をベースにし、話していない推測の手順は足しません。

【出力】
毎回 JSON オブジェクトだけを返してください。コードフェンスは付けないでください。
transcript は音声で聞いた発話です。相槌や無音だけのときは空文字です。
markdown は markmap 用の完全な Markdown 文書です。
先頭の見出しは1つだけです（# 会議名）。
話題はリストの枝で表現し、見出しは増やさないでください。
ノードの差分パッチではなく、常に全体の Markdown を出力してください。
リストの入れ子は半角スペース2つです。

【階層構造（UIとして成立させるルール）】
・第1階層（主幹ノード）：要件の対象となる具体的な「名詞」（画面、機能、デザイン、時期・スケジュール、対象者など）にします。
  動詞、依頼表現、副詞、接続詞を第1階層にしてはなりません。
・第2階層以降（子ノード）：その対象の「性質」「条件」「仕様」「関係者」をぶら下げます。同じ段に並べて切り離しません。
  例：「迷わない画面を使いやすく」→「画面」の子に「迷わない」と「使いやすい」
  例：「スマホでも見たい」→「画面」の子に「スマホ」（または「スマホ対応」）
  例：「デザインはおしゃれで、でも堅すぎない感じ」→「デザイン」の子に「おしゃれ」と「堅すぎない」
  例：「来週あたり、雰囲気が分かれば」→「時期」（または「来週」）の子に「雰囲気」

【除外ルール（絶対にノードにしない言葉）】
以下の言葉はマインドマップのノードにしてはなりません（親にも子にも配置しない）：
1. 依頼・願望の述語動詞：
   「〜してほしい」「〜見たい」「〜したい」「〜してください」「〜見せてほしい」「〜お願い」などの会話上の態度・依頼動詞。
   （「見てほしい」「見せてほしい」「したい」などの枝は作らない）
2. クッション言葉・ヘッジ（緩和表現）・口癖・程度表現：
   「できれば」「なるべく」「一応」「〜あたり」「とりあえず」「とにかく」「なるべく早く」などの副詞や緩和表現。
   （「できれば」「なるべく」などの枝は作らない）
3. 語尾の形式表現・曖昧な表現：
   「〜感じ」「〜そう」「〜とか」などの語尾は削り、核となる性質（「おしゃれ」「堅すぎない」）のみを残す。
   同じ発話に具体的な言葉があるとき、「いい感じに」等の曖昧な表現は落とし、具体語（「使いやすい」）を残す。
4. 相槌・言いよどみ・挨拶：
   「はい」「了解です」「ええと」「あ」などは書かない。
5. 文脈のない断片・認識エラー：
   「下」「行かない」「ありそう」「助けない感じ」のように、文脈から切り離されて単体で意味の通らない言葉や断片は書かない。ノードは単体で意味が通る言葉にする。

【質問と回答の処理】
質問に対して相手が答えた場合、回答によって選ばれた言葉を要件としてノードにします。
質問と回答が発話をまたいでいても文脈を繋げてください。
質問単体（未回答）では枝を増やしません。
例：「現場というのは、申請する側ですか、承認する側ですか」「どっちもです」
→ 対象（「画面」や「現場」）の子に「申請側」と「承認側」の両方を並べる。
例：「ログインはメールですか、SSOですか」「メールです」
→ 「ログイン」の子に「メール」を載せ、選ばれなかった「SSO」は外す。

【言葉の扱い】
1つの枝には1つの自立した言葉（名詞句または短い形容）を載せます。
分類のための勝手な抽象化（「おしゃれ」を「デザイン方針」、「スマホ」を「デバイス」など）には置き換えず、発話の言葉を尊重します。

【更新】
これまでの枝は、新しい発話が否定・変更しない限り残します。
新しい発話の要件は、既存の関連する親ノードの下に追加するか、新しい対象であれば第1階層に追加します。
訂正や取り消しがあった場合は、該当する枝を修正または削除します。
"""

PostJson = Callable[[str, dict[str, str], bytes], Awaitable[tuple[int, str]]]


class MindmapGenerateError(Exception):
    pass


async def _post_json(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
        response = await client.post(url, headers=headers, content=body)
        return response.status_code, response.text


def pcm16_to_wav(pcm: bytes, rate: int = PCM_RATE) -> bytes:
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        rate,
        rate * 2,
        2,
        16,
        b"data",
        data_size,
    )
    return header + pcm


def user_prompt(previous_markdown: str) -> str:
    if previous_markdown == "":
        return (
            "添付した音声から、要件の対象を親にし、性質や条件を子にした"
            "マインドマップの Markdown を作ってください。"
            "聞いた発話を transcript に書いてください。"
            "「見てほしい」「できれば」などの依頼動詞・クッション言葉・無意味な断片は除外してください。"
        )
    return (
        "前回のマインドマップ Markdown です。"
        "これまでの枝は、新しい発話が否定しない限り残してください。"
        "添付した音声から要件の対象や詳細を抽出し、適切な枝に追加または第1階層の枝を足してください。"
        "質問に回答があった場合は、選ばれた内容を反映してください。"
        "聞いた発話を transcript に書いてください。"
        "「見てほしい」「できれば」などの依頼動詞・クッション言葉・無意味な断片は枝に含めないでください。\n\n"
        f"{previous_markdown}"
    )


def response_format() -> dict[str, object]:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "mindmap_turn",
            "strict": True,
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "required": ["transcript", "markdown"],
                "properties": {
                    "transcript": {"type": "string"},
                    "markdown": {"type": "string"},
                },
            },
        },
    }


def turn_from_chat(raw: str) -> MindmapTurn:
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
    return turn_from_content(strip_fence(content))


def turn_from_content(content: str) -> MindmapTurn:
    try:
        payload: object = json.loads(content)
    except json.JSONDecodeError as error:
        raise MindmapGenerateError("invalid mindmap response") from error
    if not isinstance(payload, dict):
        raise MindmapGenerateError("invalid mindmap response")
    transcript = payload.get("transcript")
    markdown = payload.get("markdown")
    if not isinstance(transcript, str) or not isinstance(markdown, str):
        raise MindmapGenerateError("invalid mindmap response")
    document = strip_fence(markdown)
    if document == "":
        raise MindmapGenerateError("invalid mindmap response")
    return MindmapTurn(markdown=document, transcript=transcript.strip())


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

    async def generate(self, update: MindmapUpdate) -> MindmapTurn:
        wav = pcm16_to_wav(update.pcm16_mono_24k)
        instruction = user_prompt(update.previous_markdown)
        body = json.dumps(
            {
                "model": GEMINI_FLASH,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": instruction},
                            {
                                "type": "input_audio",
                                "input_audio": {
                                    "data": base64.b64encode(wav).decode("ascii"),
                                    "format": "wav",
                                },
                            },
                        ],
                    },
                ],
                "response_format": response_format(),
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
        return turn_from_chat(raw)
