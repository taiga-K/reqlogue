from dataclasses import dataclass

from reqlogue_api.application.ports import (
    ReasoningPort,
    SessionRepository,
    SpeechToTextPort,
)
from reqlogue_api.infrastructure.config import Settings


@dataclass(frozen=True)
class AppContainer:
    settings: Settings
    sessions: SessionRepository
    speech: SpeechToTextPort
    reasoner: ReasoningPort
