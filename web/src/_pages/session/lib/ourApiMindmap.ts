import { apiBaseUrl } from "./ourApiTranscriber";

export const STUB_MINDMAP_MARKDOWN = "# 会議\n\n- 要件";

export function parseMindmapResponse(value: unknown): string | null {
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
  return markdown;
}

export async function postMindmapUpdate(input: {
  readonly meetingId: string;
  readonly previousMarkdown: string;
  readonly transcriptDelta: string;
}): Promise<string> {
  const response = await fetch(`${apiBaseUrl()}/v1/mindmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingId: input.meetingId,
      previousMarkdown: input.previousMarkdown,
      transcriptDelta: input.transcriptDelta,
    }),
  });
  if (!response.ok) {
    throw new Error("mindmap unavailable");
  }
  const parsed = parseMindmapResponse((await response.json()) as unknown);
  if (parsed === null) {
    throw new Error("invalid mindmap response");
  }
  return parsed;
}

export function createMindmapUpdater(): typeof postMindmapUpdate {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return () => Promise.resolve(STUB_MINDMAP_MARKDOWN);
  }
  return postMindmapUpdate;
}
