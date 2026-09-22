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
  vi.unstubAllGlobals();
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

  it("keeps the meeting when transcription shutdown fails", async () => {
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

    const result = await endMeeting(id, () =>
      Promise.reject(new Error("shutdown failed")),
    );

    expect(result).toEqual({ status: "failed" });
    expect(readMeeting(id)?.transcript).toContain("ログインはメールでやりたい");
    expect(readRequirements(id)).toBeNull();
  });

  it("reads the transcript after in-flight transcription finishes", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
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

    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        const body = init?.body;
        if (typeof body !== "string") {
          throw new Error("requirements body");
        }
        bodies.push(JSON.parse(body) as unknown);
        return Promise.resolve(
          new Response(JSON.stringify({ markdown: "# 要件定義書\n\n本文" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    const pending = endMeeting(id, async () => {
      expect(bodies).toEqual([]);
      appendMeetingTranscript(
        id,
        new Date("2026-09-21T16:02:00.000Z"),
        "締めの発話",
      );
      await gate;
    });
    expect(bodies).toEqual([]);
    expect(readMeeting(id)?.transcript).toContain("締めの発話");

    release();
    await expect(pending).resolves.toEqual({ status: "ended" });
    expect(bodies).toEqual([
      {
        meetingId: "meet-1",
        meetingName: "新サービスの打ち合わせ",
        utterances: ["ログインはメールでやりたい", "締めの発話"],
        detections: [],
      },
    ]);
  });
});
