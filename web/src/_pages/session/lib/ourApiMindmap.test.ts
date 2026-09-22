import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMindmapTurn, postMindmapAudio } from "./ourApiMindmap";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseMindmapTurn", () => {
  it("reads markdown and transcript", () => {
    expect(
      parseMindmapTurn({ markdown: "  # 会議  ", transcript: "  ログイン  " }),
    ).toEqual({ markdown: "# 会議", transcript: "ログイン" });
    expect(parseMindmapTurn({ markdown: "# 会議" })).toBeNull();
    expect(parseMindmapTurn(null)).toBeNull();
  });
});

describe("postMindmapAudio", () => {
  it("posts PCM as multipart and never mentions openai hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        markdown: "# 会議\n\n- ログイン",
        transcript: "ログインはメール",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const audio = new ArrayBuffer(4);
    const turn = await postMindmapAudio({
      meetingId: "meet-1",
      previousMarkdown: "# 会議",
      audio,
    });
    expect(turn).toEqual({
      markdown: "# 会議\n\n- ログイン",
      transcript: "ログインはメール",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("http://127.0.0.1:8000/v1/mindmap");
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect(body.get("meetingId")).toBe("meet-1");
    expect(body.get("previousMarkdown")).toBe("# 会議");
    expect(body.get("audio")).toBeInstanceOf(Blob);
    expect(String(call?.[0])).not.toContain("api.openai.com");
    expect(String(call?.[0])).not.toContain("api.orcarouter.ai");
  });
});
