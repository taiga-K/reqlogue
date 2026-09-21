import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiBaseUrl,
  createOurApiTranscriber,
  createStubTranscriber,
  parseTranscriptResponse,
  STUB_TRANSCRIPT,
} from "./ourApiTranscriber";

const startPcmChunks = vi.hoisted(() => vi.fn());

vi.mock("./pcmChunks", () => ({
  startPcmChunks,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

afterEach(() => {
  vi.unstubAllGlobals();
  startPcmChunks.mockReset();
});

describe("parseTranscriptResponse", () => {
  it("reads trimmed text and rejects empty or speaker payloads", () => {
    expect(parseTranscriptResponse({ text: "  こんにちは  " })).toBe(
      "こんにちは",
    );
    expect(parseTranscriptResponse({ text: "   " })).toBeNull();
    expect(parseTranscriptResponse({ speaker: "進行", text: "はい" })).toBe(
      "はい",
    );
    expect(parseTranscriptResponse(null)).toBeNull();
  });
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

describe("apiBaseUrl", () => {
  it("defaults to the local FastAPI origin", () => {
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
  });
});

describe("createOurApiTranscriber", () => {
  it("serializes posts, stamps by chunk time, and drains on stop", async () => {
    const emit = captureChunks();
    const pending: Array<(value: Response) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            pending.push(resolve);
          }),
      ),
    );

    const finals: Array<{ text: string; at: Date }> = [];
    const handle = await createOurApiTranscriber().start(
      {} as MediaStream,
      (text, at) => {
        finals.push({ text, at });
      },
      () => {
        throw new Error("should not fail");
      },
    );

    const beforeFirst = Date.now();
    emit(new ArrayBuffer(2));
    const afterFirst = Date.now();
    const beforeSecond = Date.now();
    emit(new ArrayBuffer(2));
    const afterSecond = Date.now();
    await vi.waitFor(() => {
      expect(pending).toHaveLength(1);
    });

    pending[0]?.(jsonResponse({ text: "先の発話" }));
    await vi.waitFor(() => {
      expect(pending).toHaveLength(2);
    });
    pending[1]?.(jsonResponse({ text: "後の発話" }));
    await vi.waitFor(() => {
      expect(finals.map((line) => line.text)).toEqual(["先の発話", "後の発話"]);
    });
    await handle.stop();

    const firstAt = finals[0]?.at.getTime() ?? 0;
    const secondAt = finals[1]?.at.getTime() ?? 0;
    expect(firstAt).toBeGreaterThanOrEqual(beforeFirst);
    expect(firstAt).toBeLessThanOrEqual(afterFirst);
    expect(secondAt).toBeGreaterThanOrEqual(beforeSecond);
    expect(secondAt).toBeLessThanOrEqual(afterSecond);
    expect(firstAt).toBeLessThanOrEqual(secondAt);
  });

  it("does not emit a late final after stop", async () => {
    const emit = captureChunks();
    const held: { resolve?: (value: Response) => void } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            held.resolve = resolve;
          }),
      ),
    );

    const finals: string[] = [];
    const handle = await createOurApiTranscriber().start(
      {} as MediaStream,
      (text) => {
        finals.push(text);
      },
      () => {
        throw new Error("should not fail");
      },
    );
    emit(new ArrayBuffer(2));
    await vi.waitFor(() => {
      expect(held.resolve).toBeTypeOf("function");
    });
    const stopped = handle.stop();
    held.resolve?.(jsonResponse({ text: "遅い" }));
    await stopped;
    expect(finals).toEqual([]);
  });

  it("notifies failure when the API is unavailable", async () => {
    const emit = captureChunks();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse({}, 503))));

    const failures: number[] = [];
    await createOurApiTranscriber().start(
      {} as MediaStream,
      () => {
        throw new Error("should not emit");
      },
      () => {
        failures.push(1);
      },
    );
    emit(new ArrayBuffer(2));
    await vi.waitFor(() => {
      expect(failures).toEqual([1]);
    });
  });
});
