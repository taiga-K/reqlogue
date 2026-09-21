from dataclasses import dataclass, field
from enum import StrEnum


class SessionStatus(StrEnum):
    IDLE = "idle"
    LIVE = "live"
    ENDED = "ended"


class AdviceKind(StrEnum):
    AMBIGUITY = "ambiguity"
    CONTRADICTION = "contradiction"
    GAP = "gap"


@dataclass(frozen=True)
class TranscriptSegment:
    id: str
    speaker: str
    text: str
    started_at: str


@dataclass(frozen=True)
class MindmapNode:
    id: str
    label: str
    children: tuple["MindmapNode", ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class AdviceItem:
    id: str
    kind: AdviceKind
    message: str


@dataclass(frozen=True)
class SessionWorkspace:
    id: str
    title: str
    status: SessionStatus
    transcript: tuple[TranscriptSegment, ...]
    mindmap: MindmapNode
    advice: tuple[AdviceItem, ...]


@dataclass(frozen=True)
class RealtimeSttSession:
    session_id: str
    model: str
    client_secret: str
    url: str
