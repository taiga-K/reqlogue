import { describe, expect, it } from "vitest";
import {
  createMeetingRecord,
  mintMeetingId,
  type MeetingRecord,
} from "@/entities/meeting";
import { createMindmapScheduler } from "./mindmapScheduler";
import { unsentSlice } from "../model/mindmapUpdate";

type Call = {
  previousMarkdown: string;
  transcriptDelta: string;
};

function fakeClock() {
  let now = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  let nextId = 1;
  return {
    now: () => now,
    setTimeout(fn: () => void, ms: number) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimeout(id: unknown) {
      timers.delete(Number(id));
    },
    advance(ms: number) {
      now += ms;
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at);
      for (const [id, timer] of due) {
        timers.delete(id);
        timer.fn();
      }
    },
  };
}

function flush(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

function holdUpdate() {
  const calls: Call[] = [];
  const waits: {
    resolve: (markdown: string) => void;
    reject: (error: Error) => void;
  }[] = [];
  return {
    calls,
    update: async (input: {
      meetingId: string;
      previousMarkdown: string;
      transcriptDelta: string;
    }) => {
      calls.push({
        previousMarkdown: input.previousMarkdown,
        transcriptDelta: input.transcriptDelta,
      });
      return new Promise<string>((resolve, reject) => {
        waits.push({ resolve, reject });
      });
    },
    resolve(markdown: string) {
      const wait = waits.shift();
      if (wait === undefined) {
        throw new Error("no in-flight update");
      }
      wait.resolve(markdown);
      return flush();
    },
    fail() {
      const wait = waits.shift();
      if (wait === undefined) {
        throw new Error("no in-flight update");
      }
      wait.reject(new Error("mindmap unavailable"));
      return flush();
    },
  };
}

describe("createMindmapScheduler", () => {
  const meetingId = mintMeetingId(() => "meet-s");

  it("sends speech after 1.5s of quiet and resets the wait on new text", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1400);
    record = {
      ...record,
      transcript:
        "2026-09-21T16:00:00.000Z ログインはメール\n2026-09-21T16:00:01.000Z パスワードも",
    };
    scheduler.notify();
    clock.advance(1400);
    expect(held.calls).toEqual([]);
    clock.advance(100);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "ログインはメール\nパスワードも",
      },
    ]);
    await held.resolve("# 会議\n\n- ログイン");
    await flush();
    expect(record.mindmapMarkdown).toBe("# 会議\n\n- ログイン");
    expect(record.sentTranscriptOffset).toBe(record.transcript.length);
    scheduler.stop();
  });

  it("does not call for only うん and does call for other short speech", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = { ...record, transcript: "2026-09-21T16:00:00.000Z うん" };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(held.calls).toEqual([]);
    record = {
      ...record,
      transcript:
        "2026-09-21T16:00:00.000Z うん\n2026-09-21T16:00:02.000Z 了解",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "うん\n了解",
      },
    ]);
    scheduler.stop();
  });

  it("queues speech that arrives during a call into one later update", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    const firstLength = record.transcript.length;
    record = {
      ...record,
      transcript: `${record.transcript}\n2026-09-21T16:00:03.000Z パスワードも`,
    };
    scheduler.notify();
    expect(held.calls).toHaveLength(1);
    await held.resolve("# 会議\n\n- ログイン");
    await flush();
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "ログインはメール",
      },
      {
        previousMarkdown: "# 会議\n\n- ログイン",
        transcriptDelta: "パスワードも",
      },
    ]);
    expect(record.sentTranscriptOffset).toBe(firstLength + 1);
    await held.resolve("# 会議\n\n- ログイン\n- パスワード");
    await flush();
    expect(record.sentTranscriptOffset).toBe(record.transcript.length);
    expect(record.mindmapMarkdown).toBe("# 会議\n\n- ログイン\n- パスワード");
    scheduler.stop();
  });

  it("later quiet speech sends only the new delta after the saved offset", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    await held.resolve("# 会議\n\n- ログイン");
    await flush();
    await flush();
    record = {
      ...record,
      transcript: `${record.transcript}\n2026-09-21T16:00:03.000Z パスワードも`,
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "ログインはメール",
      },
      {
        previousMarkdown: "# 会議\n\n- ログイン",
        transcriptDelta: "パスワードも",
      },
    ]);
    await held.resolve("# 会議\n\n- ログイン\n- パスワード");
    await flush();
    expect(record.sentTranscriptOffset).toBe(record.transcript.length);
    expect(unsentSlice(record.transcript, record.sentTranscriptOffset)).toBe("");
    scheduler.stop();
  });

  it("sends a 200-letter line when the next segment arrives", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    const longLine = `2026-09-21T16:00:00.000Z ${"あ".repeat(200)}`;
    record = { ...record, transcript: longLine };
    scheduler.notify();
    clock.advance(100);
    await flush();
    expect(held.calls).toEqual([]);
    record = {
      ...record,
      transcript: `${longLine}\n2026-09-21T16:00:20.000Z 次の話題`,
    };
    scheduler.notify();
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "あ".repeat(200),
      },
    ]);
    scheduler.stop();
  });

  it("cuts a 200-letter line at the next segment, or after 20s if none arrives", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    const longLine = `2026-09-21T16:00:00.000Z ${"あ".repeat(200)}`;
    record = { ...record, transcript: longLine };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(held.calls).toEqual([]);
    clock.advance(20_000 - 1500);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "あ".repeat(200),
      },
    ]);
    scheduler.stop();
  });

  it("after a 200-letter cut, leftover waits 1.5s of quiet", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    const longLine = `2026-09-21T16:00:00.000Z ${"あ".repeat(200)}`;
    record = {
      ...record,
      transcript: `${longLine}\n2026-09-21T16:00:20.000Z 次の話題`,
    };
    scheduler.notify();
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "あ".repeat(200),
      },
    ]);
    await held.resolve("# 会議\n\n- 長い話");
    await flush();
    await flush();
    expect(held.calls).toHaveLength(1);
    clock.advance(1500);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "あ".repeat(200),
      },
      {
        previousMarkdown: "# 会議\n\n- 長い話",
        transcriptDelta: "次の話題",
      },
    ]);
    scheduler.stop();
  });

  it("retries a failed update after 20s and does not retry after stop", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(held.calls).toHaveLength(1);
    await held.fail();
    await flush();
    expect(held.calls).toHaveLength(1);
    clock.advance(20_000);
    await flush();
    expect(held.calls).toEqual([
      {
        previousMarkdown: "",
        transcriptDelta: "ログインはメール",
      },
      {
        previousMarkdown: "",
        transcriptDelta: "ログインはメール",
      },
    ]);
    scheduler.stop();
    await held.fail();
    await flush();
    clock.advance(20_000);
    await flush();
    expect(held.calls).toHaveLength(2);
  });

  it("restores the meeting name after the model renames the root", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "test");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    await held.resolve("# モデルの題\n\n- ログイン");
    await flush();
    expect(record.mindmapMarkdown).toBe("# test\n\n- ログイン");

    record = {
      ...record,
      name: "〇〇の要件定義会議",
      transcript: `${record.transcript}\n2026-09-21T16:00:03.000Z パスワードも`,
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    await held.resolve("# 別の題\n\n- ログイン\n- パスワード");
    await flush();
    expect(record.mindmapMarkdown).toBe(
      "# 〇〇の要件定義会議\n\n- ログイン\n- パスワード",
    );
    scheduler.stop();
  });

  it("keeps an empty root when the meeting name is blank", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "");
    const held = holdUpdate();
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => record,
      save: (markdown, sentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, mindmapMarkdown: markdown, sentTranscriptOffset };
      },
      update: held.update,
      clock,
    });
    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    await held.resolve("# 会議\n\n- ログイン");
    await flush();
    expect(record.mindmapMarkdown).toBe("# \u200b\n\n- ログイン");
    scheduler.stop();
  });
});
