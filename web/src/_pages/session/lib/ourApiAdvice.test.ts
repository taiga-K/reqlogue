import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAdviceResponse, postAdviceAnalysis } from "./ourApiAdvice";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseAdviceResponse", () => {
  it("keeps at most two items and treats an empty list as nothing to add", () => {
    expect(parseAdviceResponse({ items: [] })).toEqual([]);
    expect(
      parseAdviceResponse({
        items: [
          {
            title: " 数量 ",
            reason: "上限がない",
            suggestedQuestion: "上限はありますか？",
            quote: "数量の上限",
          },
          {
            title: "納期",
            reason: "日付がない",
            suggestedQuestion: "いつまでですか？",
            quote: "納期",
          },
          {
            title: "担当",
            reason: "人がいない",
            suggestedQuestion: "誰ですか？",
            quote: "担当者",
          },
          { title: " ", reason: "x", suggestedQuestion: "y", quote: "z" },
        ],
      }),
    ).toEqual([
      {
        title: "数量",
        reason: "上限がない",
        suggestedQuestion: "上限はありますか？",
        quote: "数量の上限",
      },
      {
        title: "納期",
        reason: "日付がない",
        suggestedQuestion: "いつまでですか？",
        quote: "納期",
      },
    ]);
    expect(parseAdviceResponse({})).toBeNull();
  });

  it("sends the lifecycle signal with the advice request", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.fn(
      () => Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchMock);
    await postAdviceAnalysis({
      meetingId: "meet-1",
      transcriptDelta: "数量",
      notifiedThemes: [],
      signal,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/advice"),
      expect.objectContaining({ signal }),
    );
  });
});
