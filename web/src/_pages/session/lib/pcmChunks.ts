const PCM_RATE = 24_000;
export const FRAME_MS = 100;
const CHUNK_MS = FRAME_MS;
const WORKLET_NAME = "reqlogue-pcm-processor";

const WORKLET_SOURCE = `
class ReqloguePcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel !== undefined) {
      this.port.postMessage(channel.slice());
    }
    return true;
  }
}
registerProcessor("${WORKLET_NAME}", ReqloguePcmProcessor);
`;

export type PcmChunkHandle = {
  stop: () => Promise<void>;
};

export async function startPcmChunks(
  stream: MediaStream,
  onChunk: (pcm: ArrayBuffer) => void,
  context = new AudioContext({ sampleRate: PCM_RATE }),
): Promise<PcmChunkHandle> {
  await context.resume();
  const source = context.createMediaStreamSource(stream);
  const workletUrl = URL.createObjectURL(
    new Blob([WORKLET_SOURCE], { type: "application/javascript" }),
  );
  await context.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);

  const node = new AudioWorkletNode(context, WORKLET_NAME);
  const pending: Float32Array[] = [];
  let pendingSamples = 0;
  const chunkSamples = Math.floor((PCM_RATE * CHUNK_MS) / 1000);

  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    pending.push(event.data);
    pendingSamples += event.data.length;
    if (pendingSamples >= chunkSamples) {
      onChunk(floatToPcm16(take(pending)));
      pendingSamples = 0;
    }
  };

  const mute = context.createGain();
  mute.gain.value = 0;
  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);

  return {
    async stop() {
      if (pendingSamples > 0) {
        onChunk(floatToPcm16(take(pending)));
        pendingSamples = 0;
      }
      node.port.close();
      node.disconnect();
      source.disconnect();
      mute.disconnect();
      await context.close();
    },
  };
}

function take(pending: Float32Array[]): Float32Array {
  const total = pending.reduce((sum, part) => sum + part.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const part of pending) {
    merged.set(part, offset);
    offset += part.length;
  }
  pending.length = 0;
  return merged;
}

export function floatToPcm16(samples: Float32Array): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(samples.length * 2));
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, Math.round(clipped * 0x7fff), true);
  }
  return view.buffer;
}
