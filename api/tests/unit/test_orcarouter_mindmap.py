import base64
import json

import pytest

from reqlogue_api.domain.mindmap import MindmapTurn, MindmapUpdate
from reqlogue_api.infrastructure.orcarouter_mindmap import (
    GEMINI_FLASH,
    ORCAROUTER_CHAT_URL,
    SYSTEM_PROMPT,
    OrcaRouterMindmapGenerator,
    pcm16_to_wav,
    strip_fence,
    turn_from_chat,
)


def loud_pcm() -> bytes:
    return (8000).to_bytes(2, "little", signed=True) * 4


def chat_body(transcript: str, markdown: str) -> str:
    return json.dumps(
        {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {"transcript": transcript, "markdown": markdown},
                            ensure_ascii=False,
                        )
                    }
                },
            ]
        }
    )


@pytest.mark.asyncio
async def test_first_call_sends_wav_audio_without_previous_map() -> None:
    captured: dict[str, object] = {}
    pcm = loud_pcm()

    async def post(url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["url"] = url
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body("ログインはメールでやりたい", "# 会議\n\n- ログイン")

    result = await OrcaRouterMindmapGenerator("orca-key", post).generate(
        MindmapUpdate(
            meeting_id="meet-9",
            previous_markdown="",
            pcm16_mono_24k=pcm,
        )
    )
    assert result == MindmapTurn(
        markdown="# 会議\n\n- ログイン",
        transcript="ログインはメールでやりたい",
    )
    assert captured["url"] == ORCAROUTER_CHAT_URL
    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers["Authorization"] == "Bearer orca-key"
    assert headers["X-OrcaRouter-Session-Id"] == "meet-9"
    payload = captured["body"]
    assert isinstance(payload, dict)
    assert payload["model"] == GEMINI_FLASH
    messages = payload["messages"]
    assert isinstance(messages, list)
    system = messages[0]
    assert isinstance(system, dict)
    assert system["content"] == SYSTEM_PROMPT
    assert "要件の対象となる具体的な「名詞」" in SYSTEM_PROMPT
    user = messages[1]
    assert isinstance(user, dict)
    content = user["content"]
    assert isinstance(content, list)
    text = content[0]
    assert isinstance(text, dict)
    assert text["type"] == "text"
    assert "添付した音声" in text["text"]
    assert "前回のマインドマップ" not in str(text["text"])
    audio = content[1]
    assert isinstance(audio, dict)
    assert audio["type"] == "input_audio"
    input_audio = audio["input_audio"]
    assert isinstance(input_audio, dict)
    assert input_audio["format"] == "wav"
    assert input_audio["data"] == base64.b64encode(pcm16_to_wav(pcm)).decode("ascii")
    assert pcm16_to_wav(pcm).startswith(b"RIFF")
    response_format = payload["response_format"]
    assert isinstance(response_format, dict)
    assert response_format["type"] == "json_schema"


@pytest.mark.asyncio
async def test_later_call_sends_previous_markdown_with_new_audio() -> None:
    captured: dict[str, object] = {}

    async def post(_url: str, headers: dict[str, str], body: bytes) -> tuple[int, str]:
        captured["headers"] = headers
        captured["body"] = json.loads(body.decode("utf-8"))
        return 200, chat_body(
            "パスワードも必要",
            "# 会議\n\n- ログイン\n  - パスワード",
        )

    result = await OrcaRouterMindmapGenerator("orca-key", post).generate(
        MindmapUpdate(
            meeting_id="meet-9",
            previous_markdown="# 会議\n\n- ログイン",
            pcm16_mono_24k=loud_pcm(),
        )
    )
    assert result == MindmapTurn(
        markdown="# 会議\n\n- ログイン\n  - パスワード",
        transcript="パスワードも必要",
    )
    payload = captured["body"]
    assert isinstance(payload, dict)
    user = payload["messages"][1]
    text = user["content"][0]["text"]
    assert "前回のマインドマップ" in text
    assert "# 会議\n\n- ログイン" in text
    assert "新しい発話:" not in text
    headers = captured["headers"]
    assert isinstance(headers, dict)
    assert headers["X-OrcaRouter-Session-Id"] == "meet-9"


def test_turn_strips_a_fence_and_rejects_empty_markdown() -> None:
    fenced = json.dumps(
        {
            "choices": [
                {
                    "message": {
                        "content": (
                            "```json\n"
                            '{"transcript":"枝","markdown":"# 会議\\n\\n- 枝"}\n'
                            "```"
                        )
                    }
                }
            ]
        }
    )
    assert turn_from_chat(fenced) == MindmapTurn(
        markdown="# 会議\n\n- 枝",
        transcript="枝",
    )
    with pytest.raises(Exception, match="invalid mindmap response"):
        turn_from_chat(chat_body("   ", "   "))
    with pytest.raises(Exception, match="invalid mindmap response"):
        turn_from_chat(chat_body("発話", "```markdown\n```"))
    assert strip_fence("# 会議") == "# 会議"
