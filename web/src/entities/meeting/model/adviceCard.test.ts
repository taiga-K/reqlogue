import { describe, expect, it } from "vitest";
import {
  acceptAdviceItems,
  moveAdviceCard,
  parseAdviceCards,
  type AdviceCard,
} from "./adviceCard";

const quantity: AdviceCard = {
  id: "card-1",
  column: "advice",
  title: "数量",
  reason: "上限がない",
  suggestedQuestion: "上限はありますか？",
  quote: "数量の上限",
};

describe("acceptAdviceItems", () => {
  it("starts new items in the advice column and skips a known title", () => {
    const added = acceptAdviceItems(
      [{ ...quantity, column: "doing", title: "納期" }],
      [
        {
          title: "納期",
          reason: "再掲",
          suggestedQuestion: "いつまでですか？",
          quote: "納期",
        },
        quantity,
      ],
      () => "card-2",
    );
    expect(added).toEqual([{ ...quantity, id: "card-2" }]);
  });
});

describe("moveAdviceCard", () => {
  it("changes the column and leaves an unknown id in place", () => {
    const moved = moveAdviceCard([quantity], "card-1", "done");
    expect(moved[0]?.column).toBe("done");
    expect(moveAdviceCard([quantity], "missing", "done")).toEqual([quantity]);
  });
});

describe("parseAdviceCards", () => {
  it("drops a card whose column is not on the board", () => {
    expect(
      parseAdviceCards({
        adviceCards: [{ ...quantity, column: "later" }],
      }),
    ).toEqual([]);
    expect(parseAdviceCards({})).toEqual([]);
  });
});
