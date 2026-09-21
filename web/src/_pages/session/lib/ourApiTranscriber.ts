import { startPcmChunks } from "./pcmChunks";
import type { TranscriptionPort } from "./startMeetingCapture";

export const STUB_TRANSCRIPT = "stub transcript";

export function createTranscriber(): TranscriptionPort {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return createStubTranscriber();
  }
  return createOurApiTranscriber();
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

export function createOurApiTranscriber(): TranscriptionPort {
  return {
    async start(stream, onFinal, onFailure) {
      let epoch = 0;
      let chain: Promise<void> = Promise.resolve();
      const pump = await startPcmChunks(stream, (pcm) => {
        const spokenAt = new Date();
        chain = chain.then(async () => {
          const started = epoch;
          try {
            const text = await postPcm(pcm);
            if (started !== epoch || text === null) {
              return;
            }
            onFinal(text, spokenAt);
          } catch {
            if (started === epoch) {
              epoch += 1;
              onFailure();
            }
          }
        });
      });
      return {
        stop: async () => {
          epoch += 1;
          await pump.stop();
          await chain;
        },
      };
    },
  };
}

async function postPcm(pcm: ArrayBuffer): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl()}/v1/transcription`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
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
