import { afterEach, describe, expect, it } from "vitest";
import { mintMeetingId } from "../model/meeting";
import {
  appendMeetingTranscript,
  clearAllMeetings,
  clearMeeting,
  MEETING_STORAGE_PREFIX,
  readMeeting,
  startNewMeeting,
} from "./meetingStorage";

afterEach(() => {
  clearAllMeetings();
});

describe("meetingStorage", () => {
  it("starts a meeting keyed by id, without speaker fields", () => {
    const record = startNewMeeting("新サービス", () => "meet-a");
    expect(record).toEqual({
      id: "meet-a",
      name: "新サービス",
      transcript: "",
    });
    expect(readMeeting(record.id)?.name).toBe("新サービス");
    expect(Object.keys(localStorage)).toEqual([
      `${MEETING_STORAGE_PREFIX}meet-a`,
    ]);
    expect(
      JSON.parse(
        localStorage.getItem(`${MEETING_STORAGE_PREFIX}meet-a`) ?? "{}",
      ),
    ).not.toHaveProperty("speaker");
  });

  it("allows an empty display name", () => {
    const record = startNewMeeting("", () => "meet-blank");
    expect(record.name).toBe("");
    expect(readMeeting(record.id)).toEqual(record);
  });

  it("clears previous meetings when a new one starts", () => {
    startNewMeeting("旧", () => "old");
    const next = startNewMeeting("新", () => "new");
    expect(readMeeting(mintMeetingId(() => "old"))).toBeNull();
    expect(readMeeting(next.id)?.name).toBe("新");
  });

  it("appends time-ordered transcript text and clears on end", () => {
    const record = startNewMeeting("会議", () => "meet-t");
    const at = new Date("2026-09-21T16:01:00.000Z");
    appendMeetingTranscript(record.id, at, "こんにちは");
    expect(readMeeting(record.id)?.transcript).toBe(
      "2026-09-21T16:01:00.000Z こんにちは",
    );
    clearMeeting(record.id);
    expect(readMeeting(record.id)).toBeNull();
  });
});
