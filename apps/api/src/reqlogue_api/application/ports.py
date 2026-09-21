from typing import Protocol

from reqlogue_api.domain.models import (
    AdviceItem,
    MindmapNode,
    RealtimeSttSession,
    SessionWorkspace,
)


class SessionRepository(Protocol):
    def get(self, session_id: str) -> SessionWorkspace | None: ...


class SpeechToTextPort(Protocol):
    def create_realtime_session(self, session_id: str) -> RealtimeSttSession: ...


class ReasoningPort(Protocol):
    def update_mindmap(self, session: SessionWorkspace) -> MindmapNode: ...

    def detect_issues(self, session: SessionWorkspace) -> tuple[AdviceItem, ...]: ...

    def export_requirements(self, session: SessionWorkspace) -> str: ...
