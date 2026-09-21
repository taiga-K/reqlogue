from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"]


class TranscriptResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str


class UnavailableResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["unavailable"]
