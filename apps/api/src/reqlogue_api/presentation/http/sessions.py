from typing import cast

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse

from reqlogue_api.application import sessions as session_use_cases
from reqlogue_api.domain.errors import SessionNotFoundError
from reqlogue_api.presentation.http.deps import AppContainer
from reqlogue_api.presentation.http.schemas import (
    AdviceItemResponse,
    CreateRealtimeSttRequest,
    MindmapNodeResponse,
    RealtimeSttSessionResponse,
    SessionWorkspaceResponse,
    TranscriptSegmentResponse,
    advice_to_response,
    mindmap_to_response,
    realtime_to_response,
    transcript_to_response,
    workspace_to_response,
)

router = APIRouter(prefix="/v1", tags=["sessions"])


def _container(request: Request) -> AppContainer:
    return cast(AppContainer, request.app.state.container)


def _not_found(exc: SessionNotFoundError) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


@router.get("/sessions/{session_id}", response_model=SessionWorkspaceResponse)
def get_session(session_id: str, request: Request) -> SessionWorkspaceResponse:
    try:
        session = session_use_cases.get_workspace(
            _container(request).sessions, session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return workspace_to_response(session)


@router.get(
    "/sessions/{session_id}/transcript", response_model=list[TranscriptSegmentResponse]
)
def get_transcript(
    session_id: str, request: Request
) -> list[TranscriptSegmentResponse]:
    try:
        segments = session_use_cases.get_transcript(
            _container(request).sessions, session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return [transcript_to_response(segment) for segment in segments]


@router.get("/sessions/{session_id}/mindmap", response_model=MindmapNodeResponse)
def get_mindmap(session_id: str, request: Request) -> MindmapNodeResponse:
    container = _container(request)
    try:
        node = session_use_cases.get_mindmap(
            container.sessions, container.reasoner, session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return mindmap_to_response(node)


@router.get("/sessions/{session_id}/advice", response_model=list[AdviceItemResponse])
def get_advice(session_id: str, request: Request) -> list[AdviceItemResponse]:
    container = _container(request)
    try:
        items = session_use_cases.get_advice(
            container.sessions, container.reasoner, session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return [advice_to_response(item) for item in items]


@router.get("/sessions/{session_id}/requirements.md")
def export_requirements(session_id: str, request: Request) -> PlainTextResponse:
    container = _container(request)
    try:
        markdown = session_use_cases.export_requirements(
            container.sessions, container.reasoner, session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return PlainTextResponse(
        content=markdown, media_type="text/markdown; charset=utf-8"
    )


@router.post("/realtime/stt/sessions", response_model=RealtimeSttSessionResponse)
def create_realtime_stt_session(
    body: CreateRealtimeSttRequest, request: Request
) -> RealtimeSttSessionResponse:
    container = _container(request)
    try:
        session = session_use_cases.create_realtime_stt_session(
            container.sessions, container.speech, body.session_id
        )
    except SessionNotFoundError as exc:
        raise _not_found(exc) from exc
    return realtime_to_response(session)
