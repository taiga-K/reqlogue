from fastapi.testclient import TestClient

from reqlogue_api.infrastructure.stub_advice import STUB_ADVICE_ITEM
from reqlogue_api.infrastructure.stub_mindmap import STUB_MINDMAP, STUB_TRANSCRIPT
from reqlogue_api.infrastructure.stub_requirements import STUB_REQUIREMENTS
from reqlogue_api.main.config import Settings
from reqlogue_api.presentation.http.app import create_app


def loud_pcm() -> bytes:
    return (8000).to_bytes(2, "little", signed=True) * 4


def test_health(settings: Settings) -> None:
    app = create_app(settings)
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}


def test_stub_mindmap_returns_transcript_and_markdown(settings: Settings) -> None:
    app = create_app(settings)
    client = TestClient(app)
    response = client.post(
        "/v1/mindmap",
        data={"meetingId": "meet-1", "previousMarkdown": ""},
        files={"audio": ("audio.pcm", loud_pcm(), "application/octet-stream")},
    )
    assert response.status_code == 200
    assert response.json() == {"markdown": STUB_MINDMAP, "transcript": STUB_TRANSCRIPT}
    assert "speaker" not in response.json()


def test_silent_audio_keeps_previous_markdown(settings: Settings) -> None:
    app = create_app(settings)
    client = TestClient(app)
    response = client.post(
        "/v1/mindmap",
        data={"meetingId": "meet-1", "previousMarkdown": "# 会議\n\n- 残す"},
        files={"audio": ("audio.pcm", b"\x00\x00" * 8, "application/octet-stream")},
    )
    assert response.status_code == 200
    assert response.json() == {"markdown": "# 会議\n\n- 残す", "transcript": ""}


def test_stub_advice_returns_one_item_and_empty_delta_adds_nothing(
    settings: Settings,
) -> None:
    app = create_app(settings)
    client = TestClient(app)
    empty = client.post(
        "/v1/advice",
        json={
            "meetingId": "meet-1",
            "transcriptDelta": "  ",
            "notifiedThemes": [],
        },
    )
    assert empty.status_code == 200
    assert empty.json() == {"items": []}

    response = client.post(
        "/v1/advice",
        json={
            "meetingId": "meet-1",
            "transcriptDelta": "数量の上限が未定",
            "notifiedThemes": ["納期"],
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "title": STUB_ADVICE_ITEM.title,
                "reason": STUB_ADVICE_ITEM.reason,
                "suggestedQuestion": STUB_ADVICE_ITEM.suggested_question,
                "quote": STUB_ADVICE_ITEM.quote,
            }
        ]
    }
    assert "speaker" not in response.text


def test_stub_requirements_returns_seven_sections(settings: Settings) -> None:
    app = create_app(settings)
    client = TestClient(app)
    response = client.post(
        "/v1/requirements",
        json={
            "meetingId": "meet-1",
            "meetingName": "新サービスの打ち合わせ",
            "utterances": ["ログインはメールでやりたい"],
            "detections": [
                {
                    "title": "数量の上限",
                    "reason": "未定のまま進む",
                    "suggestedQuestion": "上限は今決めますか？",
                    "quote": "数量の上限",
                    "column": "advice",
                }
            ],
        },
    )
    assert response.status_code == 200
    assert response.json() == {"markdown": STUB_REQUIREMENTS}
    assert STUB_REQUIREMENTS.startswith("# 要件定義書\n")
    assert "## 4. 機能要件一覧（優先度・概要・受け入れ基準）" in STUB_REQUIREMENTS
    assert "api.orcarouter.ai" not in response.text
