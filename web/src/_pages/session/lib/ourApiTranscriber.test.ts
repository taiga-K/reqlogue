import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiBaseUrl,
  createOurApiTranscriber,
  createStubTranscriber,
  parseTranscriptResponse,
  STUB_TRANSCRIPT,
  transcriptionStreamUrl,
} from "./ourApiTranscriber";

const startPcmChunks = vi.hoisted(() => vi.fn());

vi.mock("./pcmChunks", () => ({
  startPcmChunks,
}));

class FakeWebSocket {
  static sockets: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  binaryType = "";
  readyState = FakeWebSocket.OPEN;
  readonly url: string;
  readonly sent: ArrayBuffer[] = [];
  readonly sentText: string[] = [];
  private readonly listeners = new Map<string, Array<(event: Event) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.sockets.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send(data: ArrayBuffer | string) {
    if (typeof data === "string") {
      this.sentText.push(data);
      const payload = JSON.parse(data) as { type?: string };
      if (payload.type === "stop") {
        this.close();
      }
      return;
    }
    this.sent.push(data);
  }

  close() {
    if (this.readyState === FakeWebSocket.CONNECTING) {
      this.readyState = FakeWebSocket.CLOSED;
      this.emit("error", new Event("error"));
      this.emit("close", new CloseEvent("close", { code: 1006 }));
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", new CloseEvent("close", { code: 1000 }));
  }

  fail() {
    this.emit("error", new Event("error"));
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", new CloseEvent("close", { code: 1006 }));
  }

  serverMessage(data: string) {
    this.emit("message", new MessageEvent("message", { data }));
  }

  private emit(type: string, event: Event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
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
  FakeWebSocket.sockets = [];
});

describe("parseTranscriptResponse", () => {
  it("keeps boundary spaces and rejects empty or speaker payloads", () => {
    expect(parseTranscriptResponse({ text: "  こんにちは  " })).toBe(
      "  こんにちは  ",
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

describe("transcriptionStreamUrl", () => {
  it("uses a websocket without putting the overview in the url", () => {
    expect(transcriptionStreamUrl()).toBe(
      "ws://127.0.0.1:8000/v1/transcription/stream",
    );
  });
});

describe("createOurApiTranscriber", () => {
  it("streams pcm on one socket and appends transcript deltas", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const emit = captureChunks();
    const finals: string[] = [];
    const handle = await createOurApiTranscriber("").start(
      {} as MediaStream,
      (text) => {
        finals.push(text);
      },
      () => {
        throw new Error("should not fail");
      },
    );
    emit(new ArrayBuffer(2));
    emit(new ArrayBuffer(4));
    expect(FakeWebSocket.sockets).toHaveLength(1);
    expect(FakeWebSocket.sockets[0]?.sent).toHaveLength(2);
    FakeWebSocket.sockets[0]?.serverMessage(
      JSON.stringify({ text: "ログイン" }),
    );
    FakeWebSocket.sockets[0]?.serverMessage(
      JSON.stringify({ text: "はメール" }),
    );
    expect(finals).toEqual(["ログイン", "はメール"]);
    await handle.stop();
  });

  it("ignores transcript text that arrives after stop", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const emit = captureChunks();
    const finals: string[] = [];
    const handle = await createOurApiTranscriber("").start(
      {} as MediaStream,
      (text) => {
        finals.push(text);
      },
      () => {
        throw new Error("should not fail");
      },
    );
    emit(new ArrayBuffer(2));
    await handle.stop();
    FakeWebSocket.sockets[0]?.serverMessage(JSON.stringify({ text: "遅い" }));
    expect(finals).toEqual([]);
  });

  it("notifies failure when the socket closes before stop", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const emit = captureChunks();
    const failures: number[] = [];
    await createOurApiTranscriber("").start(
      {} as MediaStream,
      () => {
        throw new Error("should not emit");
      },
      () => {
        failures.push(1);
      },
    );
    emit(new ArrayBuffer(2));
    FakeWebSocket.sockets[0]?.fail();
    expect(failures).toEqual([1]);
  });

  it("sends the meeting overview before audio", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    const emit = captureChunks();
    const handle = await createOurApiTranscriber("  新サービス  ").start(
      {} as MediaStream,
      () => {},
      () => {
        throw new Error("should not fail");
      },
    );
    emit(new ArrayBuffer(2));
    const url = new URL(FakeWebSocket.sockets[0]?.url ?? "");
    expect(url.search).toBe("");
    expect(FakeWebSocket.sockets[0]?.sentText[0]).toBe(
      JSON.stringify({ type: "overview", overview: "新サービス" }),
    );
    await handle.stop();
  });

  it("sends audio flushed at stop before the stop message", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    startPcmChunks.mockImplementation(
      (_stream: MediaStream, chunk: (pcm: ArrayBuffer) => void) => {
        return Promise.resolve({
          stop: () => {
            chunk(new ArrayBuffer(4));
            return Promise.resolve();
          },
        });
      },
    );
    const handle = await createOurApiTranscriber("").start(
      {} as MediaStream,
      () => {},
      () => {
        throw new Error("should not fail");
      },
    );
    await handle.stop();
    const socket = FakeWebSocket.sockets[0];
    expect(socket?.sent).toHaveLength(1);
    expect(socket?.sentText).toEqual([
      JSON.stringify({ type: "overview", overview: "" }),
      JSON.stringify({ type: "stop" }),
    ]);
  });

  it("closes a socket that is still connecting", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    captureChunks();
    const handle = await createOurApiTranscriber("").start(
      {} as MediaStream,
      () => {},
      () => {
        throw new Error("should not fail");
      },
    );
    const socket = FakeWebSocket.sockets[0];
    if (socket === undefined) {
      throw new Error("missing socket");
    }
    socket.readyState = FakeWebSocket.CONNECTING;
    await handle.stop();
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(socket.sentText).toEqual([]);
  });
});
