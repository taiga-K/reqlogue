from fastapi import APIRouter

from reqlogue_api.application.health import health_payload, ready_payload
from reqlogue_api.presentation.http.schemas import HealthResponse, ReadyResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    return HealthResponse.model_validate(health_payload())


@router.get("/ready", response_model=ReadyResponse)
def get_ready() -> ReadyResponse:
    return ReadyResponse.model_validate(ready_payload())
