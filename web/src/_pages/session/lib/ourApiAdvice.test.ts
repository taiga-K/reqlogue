import { describe, expect, it } from "vitest";
import { parseAdviceResponse } from "./ourApiAdvice";

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
});
