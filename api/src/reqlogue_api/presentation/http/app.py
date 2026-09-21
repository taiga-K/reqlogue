from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from reqlogue_api.application.transcribe import transcribe_audio
from reqlogue_api.main.config import Settings, load_settings
from reqlogue_api.main.ioc import build_transcriber
from reqlogue_api.presentation.http.schemas import (
    HealthResponse,
    TranscriptResponse,
    UnavailableResponse,
)


class TranscriberUnavailableError(Exception):
    pass


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings if settings is not None else load_settings()
    transcriber = build_transcriber(resolved)
    app = FastAPI(title="reqlogue API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved.cors_origins),
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )

    @app.get("/health", response_model=HealthResponse)
    async def get_health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.post("/v1/transcription", response_model=TranscriptResponse)
    async def post_transcription(request: Request) -> TranscriptResponse:
        pcm = await request.body()
        try:
            transcript = await transcribe_audio(transcriber, pcm)
        except Exception as error:
            raise TranscriberUnavailableError from error
        return TranscriptResponse(text=transcript.value)

    @app.exception_handler(TranscriberUnavailableError)
    async def unavailable_handler(
        _request: Request,
        _error: TranscriberUnavailableError,
    ) -> JSONResponse:
        body = UnavailableResponse(status="unavailable")
        return JSONResponse(status_code=503, content=body.model_dump())

    return app
