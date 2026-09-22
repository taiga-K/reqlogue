import { apiBaseUrl } from "./apiBaseUrl";

export const STUB_MINDMAP_MARKDOWN = "# 会議\n\n- 要件";

export type MindmapTurn = {
  readonly markdown: string;
  readonly transcript: string;
};

export function parseMindmapTurn(value: unknown): MindmapTurn | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("markdown" in value) || typeof value.markdown !== "string") {
    return null;
  }
  if (!("transcript" in value) || typeof value.transcript !== "string") {
    return null;
  }
  return {
    markdown: value.markdown.trim(),
    transcript: value.transcript.trim(),
  };
}

export async function postMindmapAudio(input: {
  readonly meetingId: string;
  readonly previousMarkdown: string;
  readonly audio: ArrayBuffer;
}): Promise<MindmapTurn> {
  const body = new FormData();
  body.set("meetingId", input.meetingId);
  body.set("previousMarkdown", input.previousMarkdown);
  body.set(
    "audio",
    new Blob([input.audio], { type: "application/octet-stream" }),
    "audio.pcm",
  );
  const response = await fetch(`${apiBaseUrl()}/v1/mindmap`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error("mindmap unavailable");
  }
  const parsed = parseMindmapTurn((await response.json()) as unknown);
  if (parsed === null) {
    throw new Error("invalid mindmap response");
  }
  return parsed;
}
