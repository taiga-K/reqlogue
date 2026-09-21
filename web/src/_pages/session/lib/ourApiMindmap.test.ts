import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseMindmapResponse,
  postMindmapUpdate,
} from "./ourApiMindmap";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseMindmapResponse", () => {
  it("reads markdown and rejects empty payloads", () => {
    expect(parseMindmapResponse({ markdown: "  # 会議  " })).toBe("# 会議");
    expect(parseMindmapResponse({ markdown: "   " })).toBeNull();
    expect(parseMindmapResponse({ text: "# 会議" })).toBeNull();
    expect(parseMindmapResponse(null)).toBeNull();
  });
});

describe("postMindmapUpdate", () => {
  it("posts delta JSON to FastAPI and never mentions openai hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ markdown: "# 会議\n\n- ログイン" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const markdown = await postMindmapUpdate({
      meetingId: "meet-1",
      previousMarkdown: "",
      transcriptDelta: "ログインはメール",
    });
    expect(markdown).toBe("# 会議\n\n- ログイン");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("http://127.0.0.1:8000/v1/mindmap");
    expect(call?.[1]).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: "meet-1",
        previousMarkdown: "",
        transcriptDelta: "ログインはメール",
      }),
    });
    expect(String(call?.[0])).not.toContain("api.openai.com");
    expect(String(call?.[0])).not.toContain("api.orcarouter.ai");
  });
});
