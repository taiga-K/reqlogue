from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from reqlogue_api.main.config import Settings
from reqlogue_api.presentation.http.app import create_app


def test_runtime_openapi_paths_match_contract(settings: Settings) -> None:
    contract_path = Path(__file__).resolve().parents[3] / "contracts" / "openapi.yaml"
    contract = yaml.safe_load(contract_path.read_text())
    app = create_app(settings)
    runtime = TestClient(app).get("/openapi.json").json()
    assert set(runtime["paths"]) == set(contract["paths"])
    assert "/v1/transcription" in runtime["paths"]
    assert "/v1/mindmap" in runtime["paths"]
    assert "/v1/advice" in runtime["paths"]
    assert "/v1/requirements" in runtime["paths"]
    dumped = yaml.dump(contract)
    assert "speaker" not in dumped
    assert "api.openai.com" not in dumped
    assert "api.orcarouter.ai" not in dumped
