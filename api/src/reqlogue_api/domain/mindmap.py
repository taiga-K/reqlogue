from dataclasses import dataclass


@dataclass(frozen=True)
class MindmapMarkdown:
    value: str


@dataclass(frozen=True)
class MindmapUpdate:
    meeting_id: str
    previous_markdown: str
    transcript_delta: str
