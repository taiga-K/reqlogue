from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from reqlogue_api.main.config import Settings
from reqlogue_api.presentation.http.app import create_app


def test_runtime_openapi_paths_match_contract() -> None:
    contract_path = Path(__file__).resolve().parents[3] / "contracts" / "openapi.yaml"
    contract = yaml.safe_load(contract_path.read_text())
    app = create_app(
        Settings(
            openai_api_key="",
            transcriber="stub",
            cors_origins=("http://127.0.0.1:3000",),
        )
    )
    runtime = TestClient(app).get("/openapi.json").json()
    assert set(runtime["paths"]) == set(contract["paths"])
    assert "/v1/transcription" in runtime["paths"]
    assert "speaker" not in yaml.dump(contract)
