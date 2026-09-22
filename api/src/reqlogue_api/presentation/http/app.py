from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from reqlogue_api.application.analyze_advice import analyze_advice
from reqlogue_api.application.generate_requirements import generate_requirements
from reqlogue_api.application.transcribe import transcribe_audio
from reqlogue_api.application.update_mindmap import update_mindmap
from reqlogue_api.domain.advice import AdviceAnalysis
from reqlogue_api.domain.mindmap import MindmapUpdate
from reqlogue_api.domain.requirements import Detection, RequirementsSource
from reqlogue_api.main.config import Settings, load_settings
from reqlogue_api.main.ioc import (
    build_advice_analyzer,
    build_mindmap_generator,
    build_requirements_drafter,
    build_transcriber,
)
from reqlogue_api.presentation.http.schemas import (
    AdviceItemResponse,
    AdviceRequest,
    AdviceResponse,
    HealthResponse,
    MindmapResponse,
    MindmapUpdateRequest,
    RequirementsRequest,
    RequirementsResponse,
    TranscriptResponse,
    UnavailableResponse,
)


class TranscriberUnavailableError(Exception):
    pass


class MindmapUnavailableError(Exception):
    pass


class AdviceUnavailableError(Exception):
    pass


class RequirementsUnavailableError(Exception):
    pass


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings if settings is not None else load_settings()
    transcriber = build_transcriber(resolved)
    mindmap_generator = build_mindmap_generator(resolved)
    advice_analyzer = build_advice_analyzer(resolved)
    requirements_drafter = build_requirements_drafter(resolved)
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

    @app.post("/v1/mindmap", response_model=MindmapResponse)
    async def post_mindmap(body: MindmapUpdateRequest) -> MindmapResponse:
        update = MindmapUpdate(
            meeting_id=body.meeting_id,
            previous_markdown=body.previous_markdown,
            transcript_delta=body.transcript_delta,
        )
        try:
            markdown = await update_mindmap(mindmap_generator, update)
        except Exception as error:
            raise MindmapUnavailableError from error
        return MindmapResponse(markdown=markdown.value)

    @app.post("/v1/advice", response_model=AdviceResponse)
    async def post_advice(body: AdviceRequest) -> AdviceResponse:
        analysis = AdviceAnalysis(
            meeting_id=body.meeting_id,
            transcript_delta=body.transcript_delta,
            notified_themes=tuple(body.notified_themes),
        )
        try:
            batch = await analyze_advice(advice_analyzer, analysis)
        except Exception as error:
            raise AdviceUnavailableError from error
        return AdviceResponse(
            items=[
                AdviceItemResponse(
                    title=item.title,
                    reason=item.reason,
                    suggestedQuestion=item.suggested_question,
                    quote=item.quote,
                )
                for item in batch.items
            ]
        )

    @app.post("/v1/requirements", response_model=RequirementsResponse)
    async def post_requirements(body: RequirementsRequest) -> RequirementsResponse:
        source = RequirementsSource(
            meeting_id=body.meeting_id,
            meeting_name=body.meeting_name,
            utterances=tuple(body.utterances),
            detections=tuple(
                Detection(
                    title=item.title,
                    reason=item.reason,
                    suggested_question=item.suggested_question,
                    quote=item.quote,
                    column=item.column,
                )
                for item in body.detections
            ),
        )
        try:
            document = await generate_requirements(requirements_drafter, source)
        except Exception as error:
            raise RequirementsUnavailableError from error
        return RequirementsResponse(markdown=document.value)

    @app.exception_handler(TranscriberUnavailableError)
    async def unavailable_handler(
        _request: Request,
        _error: TranscriberUnavailableError,
    ) -> JSONResponse:
        payload = UnavailableResponse(status="unavailable")
        return JSONResponse(status_code=503, content=payload.model_dump())

    @app.exception_handler(MindmapUnavailableError)
    async def mindmap_unavailable_handler(
        _request: Request,
        _error: MindmapUnavailableError,
    ) -> JSONResponse:
        payload = UnavailableResponse(status="unavailable")
        return JSONResponse(status_code=503, content=payload.model_dump())

    @app.exception_handler(RequirementsUnavailableError)
    async def requirements_unavailable_handler(
        _request: Request,
        _error: RequirementsUnavailableError,
    ) -> JSONResponse:
        payload = UnavailableResponse(status="unavailable")
        return JSONResponse(status_code=503, content=payload.model_dump())

    @app.exception_handler(AdviceUnavailableError)
    async def advice_unavailable_handler(
        _request: Request,
        _error: AdviceUnavailableError,
    ) -> JSONResponse:
        payload = UnavailableResponse(status="unavailable")
        return JSONResponse(status_code=503, content=payload.model_dump())

    return app
