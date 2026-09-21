from fastapi.testclient import TestClient


def test_demo_workspace_has_placeholder_surfaces(client: TestClient) -> None:
    response = client.get("/v1/sessions/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "demo"
    assert body["transcript"]
    assert body["mindmap"]["label"]
    assert {item["kind"] for item in body["advice"]} == {
        "ambiguity",
        "contradiction",
        "gap",
    }


def test_unknown_session_is_not_found(client: TestClient) -> None:
    response = client.get("/v1/sessions/missing")
    assert response.status_code == 404


def test_requirements_export_is_markdown(client: TestClient) -> None:
    response = client.get("/v1/sessions/demo/requirements.md")
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert "# 要件定義書" in response.text
    assert "demo" in response.text


def test_realtime_stt_placeholder(client: TestClient) -> None:
    response = client.post("/v1/realtime/stt/sessions", json={"sessionId": "demo"})
    assert response.status_code == 200
    body = response.json()
    assert body["model"] == "gpt-realtime-whisper"
    assert body["sessionId"] == "demo"
    assert body["clientSecret"].startswith("placeholder-stt-secret-")
