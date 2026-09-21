import { describe, expect, it } from "vitest";
import { draftOf } from "./meetingNameDraft";

describe("draftOf", () => {
  it("treats whitespace-only input as blank", () => {
    expect(draftOf("   ").status).toBe("blank");
  });

  it("trims the name it yields", () => {
    const draft = draftOf("  新サービスの打ち合わせ  ");
    expect(draft.status).toBe("ready");
    expect(draft.status === "ready" ? draft.name : undefined).toBe(
      "新サービスの打ち合わせ",
    );
  });

  it("keeps the raw buffer verbatim so the input stays faithful", () => {
    expect(draftOf("  あ ").raw).toBe("  あ ");
  });
});
