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

export function transcriptionStreamUrl(overview: string): string {
  const url = new URL(apiBaseUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/v1/transcription/stream";
  url.search = "";
  const trimmed = overview.trim();
  if (trimmed.length > 0) {
    url.searchParams.set("overview", trimmed);
  }
  return url.toString();
}

export function createOurApiTranscriber(overview: string): TranscriptionPort {
  return {
    async start(stream, onFinal, onFailure) {
      const socket = new WebSocket(transcriptionStreamUrl(overview));
      socket.binaryType = "arraybuffer";
      const pending: ArrayBuffer[] = [];
      let closing = false;
      let failed = false;
      const closed = new Promise<void>((resolve) => {
        socket.addEventListener("close", () => {
          resolve();
        });
      });

      function fail() {
        if (closing || failed) {
          return;
        }
        failed = true;
        onFailure();
      }

      socket.addEventListener("open", () => {
        for (const pcm of pending) {
          socket.send(pcm);
        }
        pending.length = 0;
      });
      socket.addEventListener("error", () => {
        fail();
      });
      socket.addEventListener("close", (event) => {
        if (!closing && event.code !== 1000) {
          fail();
        }
      });
      socket.addEventListener("message", (event) => {
        if (closing || typeof event.data !== "string") {
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(event.data) as unknown;
        } catch {
          fail();
          return;
        }
        const text = parseTranscriptResponse(payload);
        if (text !== null) {
          onFinal(text, new Date());
        }
      });

      const pump = await startPcmChunks(stream, (pcm) => {
        if (closing) {
          return;
        }
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(pcm);
          return;
        }
        pending.push(pcm);
      });

      return {
        stop: async () => {
          closing = true;
          await pump.stop();
          if (
            socket.readyState === WebSocket.CONNECTING ||
            socket.readyState === WebSocket.OPEN
          ) {
            socket.close();
          }
          await closed;
        },
      };
    },
  };
}
