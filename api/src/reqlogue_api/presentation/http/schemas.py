from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["ok"]


class TranscriptResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str


class MindmapUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    meeting_id: str = Field(alias="meetingId", min_length=1)
    previous_markdown: str = Field(alias="previousMarkdown")
    transcript_delta: str = Field(alias="transcriptDelta")


class MindmapResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    markdown: str


class UnavailableResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["unavailable"]
