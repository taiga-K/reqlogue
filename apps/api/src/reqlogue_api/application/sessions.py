from reqlogue_api.application.ports import (
    ReasoningPort,
    SessionRepository,
    SpeechToTextPort,
)
from reqlogue_api.domain.errors import SessionNotFoundError
from reqlogue_api.domain.models import (
    AdviceItem,
    MindmapNode,
    RealtimeSttSession,
    SessionWorkspace,
    TranscriptSegment,
)


def get_workspace(repository: SessionRepository, session_id: str) -> SessionWorkspace:
    session = repository.get(session_id)
    if session is None:
        raise SessionNotFoundError(session_id)
    return session


def get_transcript(
    repository: SessionRepository, session_id: str
) -> tuple[TranscriptSegment, ...]:
    return get_workspace(repository, session_id).transcript


def get_mindmap(
    repository: SessionRepository,
    reasoner: ReasoningPort,
    session_id: str,
) -> MindmapNode:
    session = get_workspace(repository, session_id)
    return reasoner.update_mindmap(session)


def get_advice(
    repository: SessionRepository,
    reasoner: ReasoningPort,
    session_id: str,
) -> tuple[AdviceItem, ...]:
    session = get_workspace(repository, session_id)
    return reasoner.detect_issues(session)


def export_requirements(
    repository: SessionRepository,
    reasoner: ReasoningPort,
    session_id: str,
) -> str:
    session = get_workspace(repository, session_id)
    return reasoner.export_requirements(session)


def create_realtime_stt_session(
    repository: SessionRepository,
    speech: SpeechToTextPort,
    session_id: str,
) -> RealtimeSttSession:
    get_workspace(repository, session_id)
    return speech.create_realtime_session(session_id)
