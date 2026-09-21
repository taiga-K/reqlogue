import { describe, expect, it } from "vitest";
import { floatToPcm16 } from "./pcmChunks";

describe("floatToPcm16", () => {
  it("writes little-endian int16 samples", () => {
    const pcm = new Int16Array(floatToPcm16(new Float32Array([0, 1, -1])));
    expect(Array.from(pcm)).toEqual([0, 32767, -32767]);
  });
});
