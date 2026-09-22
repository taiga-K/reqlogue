import { afterEach, describe, expect, it } from "vitest";
import { mintMeetingId } from "../model/meeting";
import {
  appendMeetingTranscript,
  clearAllMeetings,
  clearMeeting,
  MEETING_STORAGE_PREFIX,
  readMeeting,
  saveAdviceProgress,
  saveMindmapProgress,
  startNewMeeting,
} from "./meetingStorage";

afterEach(() => {
  clearAllMeetings();
});

describe("meetingStorage", () => {
  it("starts a meeting keyed by id, without speaker fields", () => {
    const record = startNewMeeting({ name: "新サービス", overview: "" }, () => "meet-a");
    expect(record).toEqual({
      id: "meet-a",
      name: "新サービス",
      overview: "",
      transcript: "",
      mindmapMarkdown: "",
      sentTranscriptOffset: 0,
      adviceCards: [],
      adviceSentTranscriptOffset: 0,
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

  it("rejects an empty display name", () => {
    expect(() =>
      startNewMeeting({ name: "", overview: "" }, () => "meet-blank"),
    ).toThrow("meeting name is required");
  });

  it("clears previous meetings when a new one starts", () => {
    startNewMeeting({ name: "旧", overview: "" }, () => "old");
    const next = startNewMeeting({ name: "新", overview: "" }, () => "new");
    expect(readMeeting(mintMeetingId(() => "old"))).toBeNull();
    expect(readMeeting(next.id)?.name).toBe("新");
  });

  it("appends time-ordered transcript text and clears on end", () => {
    const record = startNewMeeting({ name: "会議", overview: "" }, () => "meet-t");
    const at = new Date("2026-09-21T16:01:00.000Z");
    appendMeetingTranscript(record.id, at, "こんにちは");
    expect(readMeeting(record.id)?.transcript).toBe(
      "2026-09-21T16:01:00.000Z こんにちは",
    );
    clearMeeting(record.id);
    expect(readMeeting(record.id)).toBeNull();
  });

  it("stores mindmap markdown and sent offset, then clears both with the record", () => {
    const record = startNewMeeting({ name: "会議", overview: "" }, () => "meet-map");
    saveMindmapProgress(record.id, "# 会議\n\n- 要件", 12);
    expect(readMeeting(record.id)).toEqual({
      id: "meet-map",
      name: "会議",
      overview: "",
      transcript: "",
      mindmapMarkdown: "# 会議\n\n- 要件",
      sentTranscriptOffset: 12,
      adviceCards: [],
      adviceSentTranscriptOffset: 0,
    });
    clearMeeting(record.id);
    expect(readMeeting(record.id)).toBeNull();
  });

  it("returns the same card list until the stored record changes", () => {
    const record = startNewMeeting({ name: "会議", overview: "" }, () => "meet-stable");
    const first = readMeeting(record.id);
    const second = readMeeting(record.id);
    expect(second?.adviceCards).toBe(first?.adviceCards);
    saveAdviceProgress(
      record.id,
      [
        {
          id: "card-1",
          column: "advice",
          title: "数量",
          reason: "上限がない",
          suggestedQuestion: "上限はありますか？",
          quote: "数量の上限",
        },
      ],
      0,
    );
    expect(readMeeting(record.id)?.adviceCards).not.toBe(first?.adviceCards);
  });

  it("keeps advice cards on the record and clears them with the meeting", () => {
    const record = startNewMeeting({ name: "会議", overview: "" }, () => "meet-advice");
    const card = {
      id: "card-1",
      column: "doing" as const,
      title: "数量",
      reason: "上限がない",
      suggestedQuestion: "上限はありますか？",
      quote: "数量の上限",
    };
    saveAdviceProgress(record.id, [card], 8);
    appendMeetingTranscript(
      record.id,
      new Date("2026-09-21T16:02:00.000Z"),
      "続き",
    );
    saveMindmapProgress(record.id, "# 会議", 4);
    expect(readMeeting(record.id)?.adviceCards).toEqual([card]);
    expect(readMeeting(record.id)?.adviceSentTranscriptOffset).toBe(8);
    clearMeeting(record.id);
    expect(readMeeting(record.id)).toBeNull();
  });

  it("drops the parsed cache when a meeting is cleared", () => {
    const record = startNewMeeting({ name: "会議", overview: "" }, () => "meet-cache");
    const first = readMeeting(record.id);
    const key = `${MEETING_STORAGE_PREFIX}meet-cache`;
    const raw = localStorage.getItem(key);
    clearMeeting(record.id);
    if (raw !== null) {
      localStorage.setItem(key, raw);
    }
    expect(readMeeting(record.id)).not.toBe(first);

    const again = startNewMeeting({ name: "会議", overview: "" }, () => "meet-cache-all");
    const cached = readMeeting(again.id);
    const allKey = `${MEETING_STORAGE_PREFIX}meet-cache-all`;
    const allRaw = localStorage.getItem(allKey);
    clearAllMeetings();
    if (allRaw !== null) {
      localStorage.setItem(allKey, allRaw);
    }
    expect(readMeeting(again.id)).not.toBe(cached);
  });
});
