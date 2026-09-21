from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from reqlogue_api.infrastructure.config import Settings
from reqlogue_api.infrastructure.memory_session_store import InMemorySessionRepository
from reqlogue_api.infrastructure.orca_router import OrcaRouterGateway
from reqlogue_api.infrastructure.stt_whisper import WhisperRealtimeGateway
from reqlogue_api.presentation.http.deps import AppContainer
from reqlogue_api.presentation.http.health import router as health_router
from reqlogue_api.presentation.http.sessions import router as sessions_router


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or Settings()
    container = AppContainer(
        settings=resolved,
        sessions=InMemorySessionRepository(),
        speech=WhisperRealtimeGateway(resolved),
        reasoner=OrcaRouterGateway(resolved),
    )

    app = FastAPI(title=resolved.api_title, version="0.1.0")
    app.state.container = container
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list(),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(sessions_router)
    return app
