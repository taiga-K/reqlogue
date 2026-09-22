import { FRAME_MS } from "./pcmChunks";

export const SILENCE_HOLD_MS = 800;
export const SILENCE_RMS = 200;

export function isSilentPcm(pcm: ArrayBuffer): boolean {
  const count = Math.floor(pcm.byteLength / 2);
  if (count === 0) {
    return true;
  }
  const view = new DataView(pcm);
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const sample = view.getInt16(index * 2, true);
    total += sample * sample;
  }
  return Math.sqrt(total / count) < SILENCE_RMS;
}

export type SpeechBuffer = {
  push: (pcm: ArrayBuffer) => ArrayBuffer | null;
  flush: () => ArrayBuffer | null;
};

export function createSpeechBuffer(): SpeechBuffer {
  const speech: ArrayBuffer[] = [];
  let silenceMs = 0;

  function takeSpeech(): ArrayBuffer | null {
    if (speech.length === 0) {
      return null;
    }
    const taken = concat(speech);
    speech.length = 0;
    silenceMs = 0;
    return taken;
  }

  return {
    push(pcm) {
      if (isSilentPcm(pcm)) {
        if (speech.length === 0) {
          return null;
        }
        silenceMs += FRAME_MS;
        if (silenceMs >= SILENCE_HOLD_MS) {
          return takeSpeech();
        }
        return null;
      }
      silenceMs = 0;
      speech.push(pcm);
      return null;
    },
    flush() {
      return takeSpeech();
    },
  };
}

function concat(parts: readonly ArrayBuffer[]): ArrayBuffer {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return merged.buffer;
}
