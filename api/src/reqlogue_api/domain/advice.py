from dataclasses import dataclass


@dataclass(frozen=True)
class AdviceItem:
    title: str
    reason: str
    suggested_question: str
    quote: str


@dataclass(frozen=True)
class AdviceAnalysis:
    meeting_id: str
    transcript_delta: str
    notified_themes: tuple[str, ...]


@dataclass(frozen=True)
class AdviceBatch:
    items: tuple[AdviceItem, ...]
