import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendMeetingTranscript,
  clearMeeting,
  createMeetingRecord,
  mintMeetingId,
  readMeeting,
  writeMeeting,
} from "@/entities/meeting";
import { FRAME_MS } from "./pcmChunks";
import { SILENCE_HOLD_MS } from "./speechBuffer";
import {
  STUB_TRANSCRIPT,
  apiBaseUrl,
  createOurApiHearing,
  createStubHearing,
  createStubTranscriber,
} from "./ourApiTranscriber";
import { STUB_MINDMAP_MARKDOWN } from "./ourApiMindmap";

const startPcmChunks = vi.hoisted(() => vi.fn());

vi.mock("./pcmChunks", () => ({
  startPcmChunks,
  FRAME_MS: 100,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function loud(): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(4));
  view.setInt16(0, 8000, true);
  view.setInt16(2, 8000, true);
  return view.buffer;
}

function quiet(): ArrayBuffer {
  return new ArrayBuffer(4);
}

function captureChunks(): (pcm: ArrayBuffer) => void {
  const held: { emit?: (pcm: ArrayBuffer) => void } = {};
  startPcmChunks.mockImplementation(
    (_stream: MediaStream, chunk: (pcm: ArrayBuffer) => void) => {
      held.emit = chunk;
      return Promise.resolve({ stop: () => Promise.resolve() });
    },
  );
  return (pcm: ArrayBuffer) => {
    const emit = held.emit;
    if (emit === undefined) {
      throw new Error("pcm callback missing");
    }
    emit(pcm);
  };
}

function holdSilence(emit: (pcm: ArrayBuffer) => void): void {
  const frames = SILENCE_HOLD_MS / FRAME_MS;
  for (let index = 0; index < frames; index += 1) {
    emit(quiet());
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  startPcmChunks.mockReset();
});

describe("createStubTranscriber", () => {
  it("emits the stub line without calling a network", async () => {
    const lines: string[] = [];
    const handle = await createStubTranscriber().start(
      {} as MediaStream,
      (text) => {
        lines.push(text);
      },
      () => {
        throw new Error("stub should not fail");
      },
    );
    expect(lines).toEqual([STUB_TRANSCRIPT]);
    await handle.stop();
  });
});

describe("createStubHearing", () => {
  it("stores the stub transcript and mindmap", async () => {
    const meetingId = mintMeetingId(() => "meet-stub");
    writeMeeting(createMeetingRecord(meetingId, "新サービス"));
    const lines: string[] = [];
    await createStubHearing(meetingId).start(
      {} as MediaStream,
      (text, at) => {
        lines.push(text);
        appendMeetingTranscript(meetingId, at, text);
      },
      () => {
        throw new Error("stub should not fail");
      },
    );
    const record = readMeeting(meetingId);
    expect(lines).toEqual([STUB_TRANSCRIPT]);
    expect(record?.transcript).toContain(STUB_TRANSCRIPT);
    expect(record?.mindmapMarkdown.startsWith("# 新サービス")).toBe(true);
    expect(record?.mindmapMarkdown).toContain(STUB_MINDMAP_MARKDOWN.split("\n")[2]);
    clearMeeting(meetingId);
  });
});

describe("apiBaseUrl", () => {
  it("defaults to the local FastAPI origin", () => {
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
  });
});

describe("createOurApiHearing", () => {
  it("posts after silence and saves the returned transcript and mindmap", async () => {
    const meetingId = mintMeetingId(() => "meet-live");
    writeMeeting(createMeetingRecord(meetingId, "新サービス"));
    const emit = captureChunks();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        markdown: "# 会議\n\n- ログイン",
        transcript: "ログインはメール",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const finals: string[] = [];
    const handle = await createOurApiHearing(meetingId).start(
      {} as MediaStream,
      (text, at) => {
        finals.push(text);
        appendMeetingTranscript(meetingId, at, text);
      },
      () => {
        throw new Error("should not fail");
      },
    );
    emit(loud());
    holdSilence(emit);
    await vi.waitFor(() => {
      expect(finals).toEqual(["ログインはメール"]);
    });
    const record = readMeeting(meetingId);
    expect(record?.transcript).toContain("ログインはメール");
    expect(record?.mindmapMarkdown.startsWith("# 新サービス")).toBe(true);
    expect(record?.mindmapMarkdown).toContain("ログイン");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await handle.stop();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clearMeeting(meetingId);
  });

  it("does not post silence and flushes leftover speech on stop", async () => {
    const meetingId = mintMeetingId(() => "meet-flush");
    writeMeeting(createMeetingRecord(meetingId, "会議"));
    const held: { emit?: (pcm: ArrayBuffer) => void } = {};
    startPcmChunks.mockImplementation(
      (_stream: MediaStream, chunk: (pcm: ArrayBuffer) => void) => {
        held.emit = chunk;
        return Promise.resolve({
          stop: () => Promise.resolve(),
        });
      },
    );
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ markdown: "# 会議\n\n- 残", transcript: "残りの発話" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const finals: string[] = [];
    const handle = await createOurApiHearing(meetingId).start(
      {} as MediaStream,
      (text, at) => {
        finals.push(text);
        appendMeetingTranscript(meetingId, at, text);
      },
      () => {
        throw new Error("should not fail");
      },
    );
    held.emit?.(quiet());
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    held.emit?.(loud());
    await handle.stop();
    expect(finals).toEqual(["残りの発話"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clearMeeting(meetingId);
  });

  it("stops after a mindmap failure", async () => {
    const meetingId = mintMeetingId(() => "meet-fail");
    const emit = captureChunks();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, 503))));
    const failures: number[] = [];
    const handle = await createOurApiHearing(meetingId).start(
      {} as MediaStream,
      () => {
        throw new Error("should not emit");
      },
      () => {
        failures.push(1);
        void handle.stop();
      },
    );
    emit(loud());
    holdSilence(emit);
    await vi.waitFor(() => {
      expect(failures).toEqual([1]);
    });
    await handle.stop();
  });
});
