import math
from dataclasses import dataclass

SILENCE_RMS = 200.0


@dataclass(frozen=True)
class MindmapTurn:
    markdown: str
    transcript: str


@dataclass(frozen=True)
class MindmapUpdate:
    meeting_id: str
    previous_markdown: str
    pcm16_mono_24k: bytes


def is_silent_pcm(pcm: bytes) -> bool:
    count = len(pcm) // 2
    if count == 0:
        return True
    total = 0
    for index in range(count):
        sample = int.from_bytes(pcm[index * 2 : index * 2 + 2], "little", signed=True)
        total += sample * sample
    return math.sqrt(total / count) < SILENCE_RMS
