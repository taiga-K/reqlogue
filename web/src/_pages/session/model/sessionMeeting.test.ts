import { describe, expect, it } from "vitest";
import { sessionMeetingFromParam } from "./sessionMeeting";

describe("sessionMeetingFromParam", () => {
  it("reads a missing param as blank", () => {
    expect(sessionMeetingFromParam(undefined)).toEqual({ status: "blank" });
  });

  it("reads whitespace as blank", () => {
    expect(sessionMeetingFromParam("   ")).toEqual({ status: "blank" });
  });

  it("trims a named meeting", () => {
    expect(sessionMeetingFromParam("  新サービスの打ち合わせ  ")).toEqual({
      status: "named",
      name: "新サービスの打ち合わせ",
    });
  });

  it("reads a repeated param as blank", () => {
    expect(sessionMeetingFromParam(["a", "b"])).toEqual({ status: "blank" });
  });
});
