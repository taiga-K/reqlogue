import { describe, expect, it } from "vitest";
import { briefOf } from "./meetingBrief";

describe("briefOf", () => {
  it("treats whitespace-only input as unnamed", () => {
    expect(briefOf("   ", "").status).toBe("unnamed");
  });

  it("stays unnamed when only the overview has text", () => {
    expect(briefOf("   ", "話したいこと").status).toBe("unnamed");
  });

  it("trims the name it yields", () => {
    const brief = briefOf("  新サービスの打ち合わせ  ", "");
    expect(brief.status).toBe("ready");
    expect(brief.status === "ready" ? brief.name : undefined).toBe(
      "新サービスの打ち合わせ",
    );
  });

  it("keeps the raw buffers verbatim so the inputs stay faithful", () => {
    const brief = briefOf("  あ ", "  い ");
    expect(brief.nameRaw).toBe("  あ ");
    expect(brief.overviewRaw).toBe("  い ");
  });

  it("allows an empty overview on ready", () => {
    const brief = briefOf("会議", "   ");
    expect(brief.status).toBe("ready");
    expect(brief.status === "ready" ? brief.overview : undefined).toBe("");
  });
});
