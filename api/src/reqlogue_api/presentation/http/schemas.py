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


class AdviceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    meeting_id: str = Field(alias="meetingId", min_length=1)
    transcript_delta: str = Field(alias="transcriptDelta")
    notified_themes: list[str] = Field(alias="notifiedThemes")


class AdviceItemResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    reason: str
    suggestedQuestion: str
    quote: str


class AdviceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[AdviceItemResponse]


class DetectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    title: str
    reason: str
    suggested_question: str = Field(alias="suggestedQuestion")
    quote: str
    column: Literal["advice", "doing", "done"]


class RequirementsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    meeting_id: str = Field(alias="meetingId", min_length=1)
    meeting_name: str = Field(alias="meetingName")
    utterances: list[str]
    detections: list[DetectionRequest]


class RequirementsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    markdown: str
