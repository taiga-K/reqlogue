import { startPcmChunks } from "./pcmChunks";
import type { TranscriptionPort } from "./startMeetingCapture";

export const STUB_TRANSCRIPT = "stub transcript";

export function createTranscriber(overview: string): TranscriptionPort {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return createStubTranscriber();
  }
  return createOurApiTranscriber(overview);
}

export function createStubTranscriber(): TranscriptionPort {
  return {
    start(_stream, onFinal) {
      onFinal(STUB_TRANSCRIPT, new Date());
      return Promise.resolve({
        stop: () => Promise.resolve(),
      });
    },
  };
}

export function apiBaseUrl(): string {
  return process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://127.0.0.1:8000";
}

export function parseTranscriptResponse(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("text" in value) || typeof value.text !== "string") {
    return null;
  }
  const text = value.text.trim();
  if (text.length === 0) {
    return null;
  }
  return text;
}

export function createOurApiTranscriber(overview: string): TranscriptionPort {
  return {
    async start(stream, onFinal, onFailure) {
      let epoch = 0;
      let closed = false;
      let draining = false;
      let chain: Promise<void> = Promise.resolve();
      const pump = await startPcmChunks(stream, (pcm) => {
        if (closed) {
          return;
        }
        const spokenAt = new Date();
        chain = chain.then(async () => {
          const started = epoch;
          try {
            const text = await postPcm(pcm, overview);
            if (started !== epoch || text === null) {
              return;
            }
            onFinal(text, spokenAt);
          } catch {
            if (started !== epoch || draining) {
              return;
            }
            epoch += 1;
            // Finish this chain step before stop waits on it.
            queueMicrotask(() => {
              onFailure();
            });
          }
        });
      });
      const settleChain = async (): Promise<void> => {
        let pending = chain;
        await pending;
        while (pending !== chain) {
          pending = chain;
          await pending;
        }
      };
      let stopping: Promise<void> | null = null;
      return {
        stop: () => {
          if (stopping === null) {
            stopping = (async () => {
              draining = true;
              await pump.stop();
              await settleChain();
              closed = true;
              epoch += 1;
            })();
          }
          return stopping;
        },
      };
    },
  };
}

async function postPcm(
  pcm: ArrayBuffer,
  overview: string,
): Promise<string | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
  };
  const trimmed = overview.trim();
  if (trimmed.length > 0) {
    headers["X-Reqlogue-Overview"] = encodeURIComponent(trimmed);
  }
  const response = await fetch(`${apiBaseUrl()}/v1/transcription`, {
    method: "POST",
    headers,
    body: pcm,
  });
  if (!response.ok) {
    throw new Error("transcription unavailable");
  }
  const value: unknown = await response.json();
  if (!hasTranscriptText(value)) {
    throw new Error("invalid transcript response");
  }
  return parseTranscriptResponse(value);
}

function hasTranscriptText(
  value: unknown,
): value is { readonly text: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string"
  );
}
