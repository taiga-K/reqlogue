import { afterEach, describe, expect, it, vi } from "vitest";
import { floatToPcm16, startPcmChunks } from "./pcmChunks";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("floatToPcm16", () => {
  it("writes little-endian int16 samples", () => {
    const pcm = new Int16Array(floatToPcm16(new Float32Array([0, 1, -1])));
    expect(Array.from(pcm)).toEqual([0, 32767, -32767]);
  });
});

describe("startPcmChunks", () => {
  it("resumes the AudioContext before connecting the graph", async () => {
    const order: string[] = [];
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:worklet",
      revokeObjectURL: () => {},
    });
    vi.stubGlobal(
      "AudioWorkletNode",
      class {
        port = { onmessage: null, close() {} };
        constructor() {
          order.push("node");
        }
        connect() {
          order.push("node.connect");
        }
        disconnect() {}
      },
    );
    const context = {
      resume: () => {
        order.push("resume");
        return Promise.resolve();
      },
      audioWorklet: {
        addModule: () => {
          order.push("addModule");
          return Promise.resolve();
        },
      },
      createMediaStreamSource: () => ({
        connect() {
          order.push("source.connect");
        },
        disconnect() {},
      }),
      createGain: () => ({
        gain: { value: 0 },
        connect() {
          order.push("gain.connect");
        },
        disconnect() {},
      }),
      destination: {},
      close: () => Promise.resolve(),
    } as unknown as AudioContext;

    await startPcmChunks({} as MediaStream, () => {}, context);
    expect(order[0]).toBe("resume");
    expect(order.indexOf("resume")).toBeLessThan(order.indexOf("source.connect"));
    expect(order.indexOf("resume")).toBeLessThan(order.indexOf("node.connect"));
  });
});
