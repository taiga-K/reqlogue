from fastapi.testclient import TestClient

from reqlogue_api.main.config import Settings
from reqlogue_api.presentation.http.app import create_app


def test_health_and_stub_transcription() -> None:
    app = create_app(
        Settings(
            openai_api_key="",
            transcriber="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    response = client.post(
        "/v1/transcription",
        content=b"\x00\x01",
        headers={"Content-Type": "application/octet-stream"},
    )
    assert response.status_code == 200
    assert response.json() == {"text": "stub transcript"}
    assert "speaker" not in response.json()
