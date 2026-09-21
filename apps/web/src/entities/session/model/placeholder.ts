import type { SessionWorkspace } from "@reqlogue/contracts";

export const DEMO_SESSION_ID = "demo";

export function createPlaceholderWorkspace(
  sessionId: string = DEMO_SESSION_ID,
): SessionWorkspace {
  return {
    id: sessionId,
    title: "受発注システムの要件定義",
    status: "live",
    transcript: [
      {
        id: "t1",
        speaker: "進行",
        text: "本日は受発注システムの要件を整理します。",
        startedAt: "2026-09-21T04:00:00Z",
      },
      {
        id: "t2",
        speaker: "顧客",
        text: "管理者が注文を承認できれば十分です。リアルタイムである必要は後で考えます。",
        startedAt: "2026-09-21T04:01:12Z",
      },
      {
        id: "t3",
        speaker: "顧客",
        text: "在庫は必ずリアルタイムで見えないと現場が困ります。",
        startedAt: "2026-09-21T04:03:40Z",
      },
    ],
    mindmap: {
      id: "root",
      label: "受発注システム",
      children: [
        { id: "actors", label: "利用者", children: [] },
        { id: "features", label: "機能", children: [] },
        { id: "constraints", label: "制約", children: [] },
      ],
    },
    advice: [
      {
        id: "a1",
        kind: "ambiguity",
        message: "「管理者」の権限範囲が未定義です。確認した方が良いのでは？",
      },
      {
        id: "a2",
        kind: "contradiction",
        message: "リアルタイム必須と後回し発言が共存しています。確認した方が良いのでは？",
      },
      {
        id: "a3",
        kind: "gap",
        message: "同時接続数などの非機能要件が未聴取です。確認した方が良いのでは？",
      },
    ],
  };
}

export function createPlaceholderRequirementsMarkdown(sessionId: string): string {
  const workspace = createPlaceholderWorkspace(sessionId);
  return [
    `# 要件定義書: ${workspace.title}`,
    "",
    `- セッション: \`${workspace.id}\``,
    "",
    "## 確認事項",
    ...workspace.advice.map((item) => `- ${item.message}`),
    "",
  ].join("\n");
}
