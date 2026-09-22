from dataclasses import dataclass


@dataclass(frozen=True)
class TranscriptText:
    value: str


@dataclass(frozen=True)
class AudioTurn:
    pcm: bytes
    overview: str
