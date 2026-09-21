from reqlogue_api.domain.models import (
    AdviceItem,
    AdviceKind,
    MindmapNode,
    SessionStatus,
    SessionWorkspace,
    TranscriptSegment,
)

DEMO_SESSION_ID = "demo"


def build_demo_workspace(session_id: str = DEMO_SESSION_ID) -> SessionWorkspace:
    return SessionWorkspace(
        id=session_id,
        title="受発注システムの要件定義",
        status=SessionStatus.LIVE,
        transcript=(
            TranscriptSegment(
                id="t1",
                speaker="進行",
                text="本日は受発注システムの要件を整理します。",
                started_at="2026-09-21T04:00:00Z",
            ),
            TranscriptSegment(
                id="t2",
                speaker="顧客",
                text="管理者が注文を承認できれば十分です。リアルタイムである必要は後で考えます。",
                started_at="2026-09-21T04:01:12Z",
            ),
            TranscriptSegment(
                id="t3",
                speaker="顧客",
                text="在庫は必ずリアルタイムで見えないと現場が困ります。",
                started_at="2026-09-21T04:03:40Z",
            ),
        ),
        mindmap=MindmapNode(
            id="root",
            label="受発注システム",
            children=(
                MindmapNode(id="actors", label="利用者", children=()),
                MindmapNode(id="features", label="機能", children=()),
                MindmapNode(id="constraints", label="制約", children=()),
            ),
        ),
        advice=(
            AdviceItem(
                id="a1",
                kind=AdviceKind.AMBIGUITY,
                message="「管理者」の権限範囲が未定義です。確認した方が良いのでは？",
            ),
            AdviceItem(
                id="a2",
                kind=AdviceKind.CONTRADICTION,
                message="リアルタイム必須と後回し発言が共存しています。確認した方が良いのでは？",
            ),
            AdviceItem(
                id="a3",
                kind=AdviceKind.GAP,
                message="同時接続数などの非機能要件が未聴取です。確認した方が良いのでは？",
            ),
        ),
    )


class InMemorySessionRepository:
    def __init__(self) -> None:
        demo = build_demo_workspace()
        self._sessions: dict[str, SessionWorkspace] = {demo.id: demo}

    def get(self, session_id: str) -> SessionWorkspace | None:
        return self._sessions.get(session_id)
