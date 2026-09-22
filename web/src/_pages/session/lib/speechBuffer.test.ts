import { describe, expect, it } from "vitest";
import { FRAME_MS } from "./pcmChunks";
import {
  SILENCE_HOLD_MS,
  createSpeechBuffer,
  isSilentPcm,
} from "./speechBuffer";

function pcm(sample: number): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(4));
  view.setInt16(0, sample, true);
  view.setInt16(2, sample, true);
  return view.buffer;
}

const loud = () => pcm(8000);
const quiet = () => pcm(0);

describe("isSilentPcm", () => {
  it("treats near-zero samples as silence and loud samples as speech", () => {
    expect(isSilentPcm(quiet())).toBe(true);
    expect(isSilentPcm(loud())).toBe(false);
    expect(isSilentPcm(new ArrayBuffer(0))).toBe(true);
  });
});

describe("createSpeechBuffer", () => {
  it("sends speech only after 0.8 seconds of silence", () => {
    const buffer = createSpeechBuffer();
    expect(buffer.push(loud())).toBeNull();
    const silentFrames = SILENCE_HOLD_MS / FRAME_MS;
    for (let index = 0; index < silentFrames - 1; index += 1) {
      expect(buffer.push(quiet())).toBeNull();
    }
    const sent = buffer.push(quiet());
    expect(sent).not.toBeNull();
    expect(new Int16Array(sent ?? new ArrayBuffer(0))).toEqual(
      new Int16Array(loud()),
    );
    expect(buffer.flush()).toBeNull();
  });

  it("does not send a silence-only stretch", () => {
    const buffer = createSpeechBuffer();
    for (let index = 0; index < SILENCE_HOLD_MS / FRAME_MS; index += 1) {
      expect(buffer.push(quiet())).toBeNull();
    }
    expect(buffer.flush()).toBeNull();
  });

  it("resets the silence hold when speech resumes", () => {
    const buffer = createSpeechBuffer();
    buffer.push(loud());
    for (let index = 0; index < SILENCE_HOLD_MS / FRAME_MS - 1; index += 1) {
      buffer.push(quiet());
    }
    expect(buffer.push(loud())).toBeNull();
    for (let index = 0; index < SILENCE_HOLD_MS / FRAME_MS - 1; index += 1) {
      expect(buffer.push(quiet())).toBeNull();
    }
    expect(buffer.push(quiet())).not.toBeNull();
  });

  it("flushes speech that has not reached a silence yet", () => {
    const buffer = createSpeechBuffer();
    buffer.push(loud());
    const rest = buffer.flush();
    expect(new Int16Array(rest ?? new ArrayBuffer(0))).toEqual(
      new Int16Array(loud()),
    );
  });
});
