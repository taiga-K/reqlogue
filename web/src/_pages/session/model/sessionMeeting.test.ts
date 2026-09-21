import { describe, expect, it } from "vitest";
import { sessionMeetingFromParam } from "./sessionMeeting";

describe("sessionMeetingFromParam", () => {
  it("treats a missing param as blank", () => {
    expect(sessionMeetingFromParam(undefined)).toEqual({ status: "blank" });
  });

  it("treats whitespace as blank", () => {
    expect(sessionMeetingFromParam("   ")).toEqual({ status: "blank" });
  });

  it("yields a named meeting from a trimmed string", () => {
    expect(sessionMeetingFromParam("  新サービスの打ち合わせ  ")).toEqual({
      status: "named",
      name: "新サービスの打ち合わせ",
    });
  });

  it("treats a repeated param as blank", () => {
    expect(sessionMeetingFromParam(["新サービス", "打ち合わせ"])).toEqual({
      status: "blank",
    });
  });
});
