import { describe, expect, it } from "vitest";
import {
  appendTranscriptLine,
  createMeetingRecord,
  mintMeetingId,
  parseMeetingId,
  parseMeetingRecord,
} from "./meeting";

describe("parseMeetingId", () => {
  it("rejects blank and whitespace", () => {
    expect(parseMeetingId("")).toBeNull();
    expect(parseMeetingId("   ")).toBeNull();
  });

  it("yields a trimmed id", () => {
    expect(parseMeetingId("  abc-123  ")).toBe("abc-123");
  });
});

describe("mintMeetingId", () => {
  it("uses the uuid factory", () => {
    expect(mintMeetingId(() => "11111111-1111-4111-8111-111111111111")).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("appendTranscriptLine", () => {
  it("appends time-ordered plain text and ignores blank lines", () => {
    const at = new Date("2026-09-21T16:00:00.000Z");
    expect(appendTranscriptLine("", at, "  こんにちは  ")).toBe(
      "2026-09-21T16:00:00.000Z こんにちは",
    );
    expect(
      appendTranscriptLine("2026-09-21T16:00:00.000Z こんにちは", at, "次"),
    ).toBe(
      "2026-09-21T16:00:00.000Z こんにちは\n2026-09-21T16:00:00.000Z 次",
    );
    expect(appendTranscriptLine("kept", at, "   ")).toBe("kept");
  });
});

describe("parseMeetingRecord", () => {
  const id = mintMeetingId(() => "meet-1");

  it("reads a matching record and drops extra fields", () => {
    expect(
      parseMeetingRecord(id, {
        id: "meet-1",
        name: "新サービス",
        transcript: "line",
        speaker: "nope",
      }),
    ).toEqual({
      id: "meet-1",
      name: "新サービス",
      transcript: "line",
    });
  });

  it("rejects a mismatched id or missing fields", () => {
    expect(parseMeetingRecord(id, createMeetingRecord(id, "x"))).toEqual({
      id: "meet-1",
      name: "x",
      transcript: "",
    });
    expect(parseMeetingRecord(id, { id: "other", name: "", transcript: "" })).toBeNull();
    expect(parseMeetingRecord(id, null)).toBeNull();
  });
});
