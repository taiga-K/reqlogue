from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptText:
    value: str
