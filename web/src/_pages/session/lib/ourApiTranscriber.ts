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

function createOurApiTranscriber(): TranscriptionPort {
  return {
    async start(stream, onFinal) {
      const pump = await startPcmChunks(stream, (pcm) => {
        void postPcm(pcm).then((text) => {
          if (text !== null) {
            onFinal(text, new Date());
          }
        });
      });
      return {
        stop: () => pump.stop(),
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
    return null;
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return null;
  }
  return parseTranscriptResponse(value);
}
