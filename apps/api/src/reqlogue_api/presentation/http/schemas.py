from pydantic import BaseModel, ConfigDict, Field

from reqlogue_api.domain.models import (
    AdviceItem,
    MindmapNode,
    RealtimeSttSession,
    SessionWorkspace,
    TranscriptSegment,
)


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class HealthResponse(CamelModel):
    status: str
    service: str


class ReadyResponse(CamelModel):
    status: str


class TranscriptSegmentResponse(CamelModel):
    id: str
    speaker: str
    text: str
    started_at: str = Field(serialization_alias="startedAt")


class MindmapNodeResponse(CamelModel):
    id: str
    label: str
    children: list["MindmapNodeResponse"]


class AdviceItemResponse(CamelModel):
    id: str
    kind: str
    message: str


class SessionWorkspaceResponse(CamelModel):
    id: str
    title: str
    status: str
    transcript: list[TranscriptSegmentResponse]
    mindmap: MindmapNodeResponse
    advice: list[AdviceItemResponse]


class CreateRealtimeSttRequest(CamelModel):
    session_id: str = Field(alias="sessionId")


class RealtimeSttSessionResponse(CamelModel):
    session_id: str = Field(serialization_alias="sessionId")
    model: str
    client_secret: str = Field(serialization_alias="clientSecret")
    url: str


def transcript_to_response(segment: TranscriptSegment) -> TranscriptSegmentResponse:
    return TranscriptSegmentResponse(
        id=segment.id,
        speaker=segment.speaker,
        text=segment.text,
        started_at=segment.started_at,
    )


def mindmap_to_response(node: MindmapNode) -> MindmapNodeResponse:
    return MindmapNodeResponse(
        id=node.id,
        label=node.label,
        children=[mindmap_to_response(child) for child in node.children],
    )


def advice_to_response(item: AdviceItem) -> AdviceItemResponse:
    return AdviceItemResponse(id=item.id, kind=item.kind.value, message=item.message)


def workspace_to_response(session: SessionWorkspace) -> SessionWorkspaceResponse:
    return SessionWorkspaceResponse(
        id=session.id,
        title=session.title,
        status=session.status.value,
        transcript=[transcript_to_response(segment) for segment in session.transcript],
        mindmap=mindmap_to_response(session.mindmap),
        advice=[advice_to_response(item) for item in session.advice],
    )


def realtime_to_response(session: RealtimeSttSession) -> RealtimeSttSessionResponse:
    return RealtimeSttSessionResponse(
        session_id=session.session_id,
        model=session.model,
        client_secret=session.client_secret,
        url=session.url,
    )
