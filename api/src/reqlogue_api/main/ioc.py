from collections.abc import Awaitable, Callable

import websockets

from reqlogue_api.application.ports import MindmapGenerator, Transcriber
from reqlogue_api.infrastructure.openai_whisper import OpenAiRealtimeTranscriber
from reqlogue_api.infrastructure.orcarouter_mindmap import OrcaRouterMindmapGenerator
from reqlogue_api.infrastructure.stub_mindmap import StubMindmapGenerator
from reqlogue_api.infrastructure.stub_transcriber import StubTranscriber
from reqlogue_api.main.config import Settings


async def _connect(url: str, headers: list[str]) -> object:
    parsed: dict[str, str] = {}
    for header in headers:
        name, value = header.split(": ", 1)
        parsed[name] = value
    return await websockets.connect(url, additional_headers=parsed)


def build_transcriber(
    settings: Settings,
    connect: Callable[[str, list[str]], Awaitable[object]] = _connect,
) -> Transcriber:
    if settings.transcriber == "openai":
        if settings.openai_api_key == "":
            raise RuntimeError("OPENAI_API_KEY is required for the openai transcriber")
        return OpenAiRealtimeTranscriber(settings.openai_api_key, connect)
    if settings.transcriber == "stub":
        return StubTranscriber()
    raise RuntimeError(f"Unsupported transcriber: {settings.transcriber}")


def build_mindmap_generator(settings: Settings) -> MindmapGenerator:
    if settings.mindmap == "orcarouter":
        if settings.orcarouter_api_key == "":
            raise RuntimeError(
                "ORCAROUTER_API_KEY is required for the orcarouter mindmap"
            )
        return OrcaRouterMindmapGenerator(settings.orcarouter_api_key)
    if settings.mindmap == "stub":
        return StubMindmapGenerator()
    raise RuntimeError(f"Unsupported mindmap: {settings.mindmap}")
