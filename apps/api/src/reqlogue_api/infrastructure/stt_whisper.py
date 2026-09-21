from reqlogue_api.domain.models import RealtimeSttSession
from reqlogue_api.infrastructure.config import Settings

REALTIME_TRANSCRIPTION_URL = "https://api.openai.com/v1/realtime/transcription_sessions"


class WhisperRealtimeGateway:
    """Placeholder adapter for GPT-Realtime-Whisper.

    Live minting against `/v1/realtime/transcription_sessions` is gated by
    `OPENAI_STT_LIVE`. The skeleton always returns a deterministic session.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def create_realtime_session(self, session_id: str) -> RealtimeSttSession:
        if self._settings.openai_stt_live and not self._settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required when OPENAI_STT_LIVE=true")

        secret = (
            "live-not-minted"
            if self._settings.openai_stt_live
            else f"placeholder-stt-secret-{session_id}"
        )
        return RealtimeSttSession(
            session_id=session_id,
            model=self._settings.openai_stt_model,
            client_secret=secret,
            url=REALTIME_TRANSCRIPTION_URL,
        )
