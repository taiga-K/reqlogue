import { describe, expect, it } from "vitest";
import {
  clearMeeting,
  createMeetingRecord,
  mintMeetingId,
  moveAdviceCard,
  readMeeting,
  saveAdviceProgress,
  subscribeMeetingTranscript,
  writeMeeting,
  type AdviceCard,
  type MeetingRecord,
} from "@/entities/meeting";
import { createAdviceScheduler } from "./adviceScheduler";
import { createMindmapScheduler } from "./mindmapScheduler";

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

const quantity = {
  title: "数量",
  reason: "上限がない",
  suggestedQuestion: "上限はありますか？",
  quote: "数量の上限",
};

describe("createAdviceScheduler", () => {
  const meetingId = mintMeetingId(() => "meet-advice");

  it("waits 1.5s, skips fillers, and puts a new card in the advice column", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = createMeetingRecord(meetingId, "会議");
    const calls: string[][] = [];
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => record,
      save: (cards, adviceSentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, adviceCards: cards, adviceSentTranscriptOffset };
      },
      update: (input) => {
        calls.push([...input.notifiedThemes]);
        return Promise.resolve([quantity]);
      },
      createId: () => "card-1",
      clock,
    });
    record = { ...record, transcript: "2026-09-21T16:00:00.000Z うん" };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(calls).toEqual([]);

    record = {
      ...record,
      transcript: "2026-09-21T16:00:00.000Z うん\n2026-09-21T16:00:01.000Z 数量の上限が未定",
    };
    scheduler.notify();
    clock.advance(1400);
    expect(calls).toEqual([]);
    clock.advance(100);
    await flush();
    expect(calls).toEqual([[]]);
    expect(record.adviceCards).toEqual([
      { id: "card-1", column: "advice", ...quantity },
    ]);
    expect(record.adviceSentTranscriptOffset).toBe(record.transcript.length);
    scheduler.stop();
  });

  it("coalesces text that arrives while an analysis is in flight", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = {
      ...createMeetingRecord(meetingId, "会議"),
      transcript: "2026-09-21T16:00:00.000Z 数量の上限が未定",
    };
    let release: (() => void) | undefined;
    const deltas: string[] = [];
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => record,
      save: (cards, adviceSentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, adviceCards: cards, adviceSentTranscriptOffset };
      },
      update: (input) => {
        deltas.push(input.transcriptDelta);
        return new Promise((resolve) => {
          release = () => {
            resolve(input.transcriptDelta.includes("納期") ? [] : [quantity]);
          };
        });
      },
      createId: () => "card-1",
      clock,
    });
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(deltas).toEqual(["数量の上限が未定"]);
    record = {
      ...record,
      transcript: `${record.transcript}\n2026-09-21T16:00:03.000Z 納期は来月`,
    };
    scheduler.notify();
    clock.advance(1500);
    expect(deltas).toEqual(["数量の上限が未定"]);
    release?.();
    await flush();
    await flush();
    release?.();
    await flush();
    expect(deltas).toEqual(["数量の上限が未定", "納期は来月"]);
    expect(record.adviceCards.map((card: AdviceCard) => card.title)).toEqual(["数量"]);
    expect(record.adviceSentTranscriptOffset).toBe(record.transcript.length);
    scheduler.stop();
  });

  it("drops an in-flight result when the meeting record is replaced", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = {
      ...createMeetingRecord(meetingId, "会議"),
      transcript: "2026-09-21T16:00:00.000Z 数量の上限が未定",
    };
    const pending: Array<(items: readonly (typeof quantity)[]) => void> = [];
    const deltas: string[] = [];
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => record,
      save: (cards, adviceSentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, adviceCards: cards, adviceSentTranscriptOffset };
      },
      update: (input) => {
        deltas.push(input.transcriptDelta);
        return new Promise((resolve) => {
          pending.push(resolve);
        });
      },
      createId: () => "card-1",
      clock,
    });
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(deltas).toEqual(["数量の上限が未定"]);
    record = {
      ...createMeetingRecord(meetingId, "会議"),
      transcript: "2026-09-21T16:05:00.000Z 納期は来月",
    };
    pending[0]?.([quantity]);
    await flush();
    await flush();
    expect(record.adviceCards).toEqual([]);
    expect(record.adviceSentTranscriptOffset).toBe(0);
    clock.advance(1500);
    await flush();
    expect(deltas).toEqual(["数量の上限が未定", "納期は来月"]);
    pending[1]?.([quantity]);
    await flush();
    expect(record.adviceCards.map((card: AdviceCard) => card.title)).toEqual(["数量"]);
    expect(record.adviceSentTranscriptOffset).toBe(record.transcript.length);
    scheduler.stop();
  });

  it("adds nothing when the model returns an empty list", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = {
      ...createMeetingRecord(meetingId, "会議"),
      transcript: "2026-09-21T16:00:00.000Z ログインはメール",
    };
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => record,
      save: (cards, adviceSentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, adviceCards: cards, adviceSentTranscriptOffset };
      },
      update: () => Promise.resolve([]),
      clock,
    });
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(record.adviceCards).toEqual([]);
    expect(record.adviceSentTranscriptOffset).toBe(record.transcript.length);
    scheduler.stop();
  });

  it("does not re-arm either quiet timer when a card moves", async () => {
    const clock = fakeClock();
    const id = mintMeetingId(() => "meet-drag");
    const card: AdviceCard = {
      id: "card-1",
      column: "advice",
      ...quantity,
    };
    writeMeeting({
      ...createMeetingRecord(id, "会議"),
      transcript: "2026-09-21T16:00:00.000Z 数量の上限が未定",
      adviceCards: [card],
    });
    const adviceDeltas: string[] = [];
    const mindmapDeltas: string[] = [];
    const advice = createAdviceScheduler({
      meetingId: id,
      read: () => readMeeting(id),
      save: (cards, adviceSentTranscriptOffset) => {
        saveAdviceProgress(id, cards, adviceSentTranscriptOffset);
      },
      update: (input) => {
        adviceDeltas.push(input.transcriptDelta);
        return Promise.resolve([]);
      },
      clock,
    });
    const mindmap = createMindmapScheduler({
      meetingId: id,
      read: () => readMeeting(id),
      save: () => {},
      update: (input) => {
        mindmapDeltas.push(input.transcriptDelta);
        return Promise.resolve("# 会議");
      },
      clock,
    });
    const stopAdvice = subscribeMeetingTranscript(() => {
      advice.notify();
    });
    const stopMindmap = subscribeMeetingTranscript(() => {
      mindmap.notify();
    });
    advice.notify();
    mindmap.notify();
    clock.advance(400);
    const current = readMeeting(id);
    if (current === null) {
      throw new Error("missing meeting");
    }
    saveAdviceProgress(id, moveAdviceCard(current.adviceCards, card.id, "doing"), current.adviceSentTranscriptOffset);
    clock.advance(1100);
    await flush();
    expect(adviceDeltas).toEqual(["数量の上限が未定"]);
    expect(mindmapDeltas).toEqual(["数量の上限が未定"]);
    advice.stop();
    mindmap.stop();
    stopAdvice();
    stopMindmap();
    clearMeeting(id);
  });

  it("aborts a hung advice request and releases the in-flight send", async () => {
    const clock = fakeClock();
    let record: MeetingRecord | null = {
      ...createMeetingRecord(meetingId, "会議"),
      transcript: "2026-09-21T16:00:00.000Z 数量の上限が未定",
    };
    let calls = 0;
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => record,
      save: (cards, adviceSentTranscriptOffset) => {
        if (record === null) {
          return;
        }
        record = { ...record, adviceCards: cards, adviceSentTranscriptOffset };
      },
      update: (input) => {
        calls += 1;
        if (calls === 1) {
          return new Promise((resolve, reject) => {
            input.signal.addEventListener("abort", () => {
              reject(new Error("aborted"));
            });
          });
        }
        return Promise.resolve([quantity]);
      },
      createId: () => "card-1",
      requestTimeoutMs: 20,
      clock,
    });
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(calls).toBe(1);
    clock.advance(20);
    await flush();
    await flush();
    record = {
      ...record,
      transcript: `${record.transcript}\n2026-09-21T16:00:03.000Z 納期は来月`,
    };
    scheduler.notify();
    clock.advance(1500);
    await flush();
    expect(calls).toBe(2);
    expect(record.adviceCards.map((card: AdviceCard) => card.title)).toEqual(["数量"]);
    scheduler.stop();
  });
});
