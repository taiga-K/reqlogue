import type { AdviceDraft } from "@/entities/meeting";
import { apiBaseUrl } from "./ourApiTranscriber";

export const STUB_ADVICE_ITEMS: readonly AdviceDraft[] = [
  {
    title: "確認したい点",
    reason: "このままだと認識がずれる",
    suggestedQuestion: "ここは今決めてよいですか？",
    quote: "確認したい点",
  },
];

export function parseAdviceResponse(value: unknown): readonly AdviceDraft[] | null {
  if (typeof value !== "object" || value === null || !("items" in value)) {
    return null;
  }
  if (!Array.isArray(value.items)) {
    return null;
  }
  const items: AdviceDraft[] = [];
  for (const item of value.items) {
    const draft = parseAdviceDraft(item);
    if (draft === null) {
      continue;
    }
    items.push(draft);
    if (items.length === 2) {
      break;
    }
  }
  return items;
}

export async function postAdviceAnalysis(input: {
  readonly meetingId: string;
  readonly transcriptDelta: string;
  readonly notifiedThemes: readonly string[];
}): Promise<readonly AdviceDraft[]> {
  const response = await fetch(`${apiBaseUrl()}/v1/advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingId: input.meetingId,
      transcriptDelta: input.transcriptDelta,
      notifiedThemes: input.notifiedThemes,
    }),
  });
  if (!response.ok) {
    throw new Error("advice unavailable");
  }
  const parsed = parseAdviceResponse((await response.json()) as unknown);
  if (parsed === null) {
    throw new Error("invalid advice response");
  }
  return parsed;
}

export function createAdviceUpdater(): typeof postAdviceAnalysis {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return () => Promise.resolve(STUB_ADVICE_ITEMS);
  }
  return postAdviceAnalysis;
}

function parseAdviceDraft(value: unknown): AdviceDraft | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const title = "title" in value ? trimmed(value.title) : null;
  const reason = "reason" in value ? trimmed(value.reason) : null;
  const suggestedQuestion =
    "suggestedQuestion" in value ? trimmed(value.suggestedQuestion) : null;
  const quote = "quote" in value ? trimmed(value.quote) : null;
  if (
    title === null ||
    reason === null ||
    suggestedQuestion === null ||
    quote === null
  ) {
    return null;
  }
  return { title, reason, suggestedQuestion, quote };
}

function trimmed(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (text.length === 0) {
    return null;
  }
  return text;
}
