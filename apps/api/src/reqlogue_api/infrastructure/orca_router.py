from openai import OpenAI

from reqlogue_api.domain.models import AdviceItem, MindmapNode, SessionWorkspace
from reqlogue_api.infrastructure.config import Settings


def render_requirements_markdown(session: SessionWorkspace) -> str:
    advice_lines = "\n".join(
        f"- [{item.kind.value}] {item.message}" for item in session.advice
    )
    transcript_lines = "\n".join(
        f"- {segment.speaker}: {segment.text}" for segment in session.transcript
    )
    return "\n".join(
        [
            f"# 要件定義書: {session.title}",
            "",
            f"- セッション: `{session.id}`",
            f"- 状態: `{session.status.value}`",
            "",
            "## ヒアリングメモ",
            transcript_lines,
            "",
            "## 確認事項",
            advice_lines,
            "",
            "## 次の実装",
            "OrcaRouter (`ORCAROUTER_BASE_URL`) 経由で本文生成する。",
            "",
        ]
    )


class OrcaRouterGateway:
    """Placeholder adapter for mindmap updates and requirements export.

    OrcaRouter is OpenAI-compatible. Point `OpenAI(base_url=...)` at
    https://api.orcarouter.ai/v1 when `ORCAROUTER_LIVE=true`.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def update_mindmap(self, session: SessionWorkspace) -> MindmapNode:
        self._maybe_require_live_client()
        return session.mindmap

    def detect_issues(self, session: SessionWorkspace) -> tuple[AdviceItem, ...]:
        self._maybe_require_live_client()
        return session.advice

    def export_requirements(self, session: SessionWorkspace) -> str:
        self._maybe_require_live_client()
        return render_requirements_markdown(session)

    def _maybe_require_live_client(self) -> OpenAI | None:
        if not self._settings.orcarouter_live:
            return None
        if not self._settings.orcarouter_api_key:
            raise RuntimeError(
                "ORCAROUTER_API_KEY is required when ORCAROUTER_LIVE=true"
            )
        return OpenAI(
            api_key=self._settings.orcarouter_api_key,
            base_url=self._settings.orcarouter_base_url,
        )
