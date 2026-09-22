import type { AdviceColumn } from "@/entities/meeting";
import { apiBaseUrl } from "./ourApiTranscriber";

export const STUB_REQUIREMENTS_MARKDOWN = `# 要件定義書

## 1. プロジェクト/会議概要・背景・ゴール

スタブの概要です。

## 2. スコープ（対象範囲・対象外範囲）

スタブのスコープです。

## 3. 業務フロー・ユースケース定義

スタブの業務フローです。

## 4. 機能要件一覧（優先度・概要・受け入れ基準）

スタブの機能要件です。

## 5. 非機能要件・制約条件

スタブの非機能要件です。

## 6. 未決事項（ToDo / 宿題）・確認中リスク一覧

スタブの未決事項です。

## 7. 発話ログ要約・変更履歴

スタブの変更履歴です。
`;

export type RequirementsRequest = {
  readonly meetingId: string;
  readonly meetingName: string;
  readonly utterances: readonly string[];
  readonly detections: readonly {
    readonly title: string;
    readonly reason: string;
    readonly suggestedQuestion: string;
    readonly quote: string;
    readonly column: AdviceColumn;
  }[];
};

export function parseRequirementsResponse(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("markdown" in value) || typeof value.markdown !== "string") {
    return null;
  }
  const markdown = value.markdown.trim();
  if (markdown.length === 0) {
    return null;
  }
  return value.markdown;
}

export async function postRequirements(
  input: RequirementsRequest,
): Promise<string> {
  const response = await fetch(`${apiBaseUrl()}/v1/requirements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error("requirements unavailable");
  }
  const parsed = parseRequirementsResponse((await response.json()) as unknown);
  if (parsed === null) {
    throw new Error("invalid requirements response");
  }
  return parsed;
}

export function createRequirementsGenerator(): (
  input: RequirementsRequest,
) => Promise<string> {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return () => Promise.resolve(STUB_REQUIREMENTS_MARKDOWN);
  }
  return postRequirements;
}
