import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendMeetingTranscript,
  clearAllMeetings,
  createMeetingRecord,
  parseMeetingId,
  readMeeting,
  readRequirements,
  writeMeeting,
} from "@/entities/meeting";
import { endMeeting } from "./endMeeting";
import { STUB_REQUIREMENTS_MARKDOWN } from "./ourApiRequirements";

afterEach(() => {
  clearAllMeetings();
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe("endMeeting", () => {
  it("stores the requirements markdown and clears the meeting record", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    const id = parseMeetingId("meet-1");
    if (id === null) {
      throw new Error("id");
    }
    writeMeeting(createMeetingRecord(id, "新サービスの打ち合わせ"));
    appendMeetingTranscript(
      id,
      new Date("2026-09-21T16:01:00.000Z"),
      "ログインはメールでやりたい",
    );

    const result = await endMeeting(id);

    expect(result).toEqual({ status: "ended" });
    expect(readMeeting(id)).toBeNull();
    expect(readRequirements(id)).toEqual({
      meetingId: "meet-1",
      name: "新サービスの打ち合わせ",
      markdown: STUB_REQUIREMENTS_MARKDOWN,
    });
    expect(localStorage.getItem("reqlogue.meeting.meet-1")).toBeNull();
  });
});
