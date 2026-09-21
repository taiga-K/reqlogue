import { describe, expect, it, vi } from "vitest";
import { startMeetingCapture, type CapturePorts } from "./startMeetingCapture";

function audioStream(): MediaStream {
  return {
    getAudioTracks: () => [{ stop() {} }],
    getTracks: () => [{ stop() {} }],
  } as unknown as MediaStream;
}

function silentStream(): MediaStream {
  return {
    getAudioTracks: () => [],
    getTracks: () => [{ stop() {} }],
  } as unknown as MediaStream;
}

describe("startMeetingCapture", () => {
  it("starts when tab audio and transcription are available", async () => {
    const appendTranscript = vi.fn();
    const stopTranscribe = vi.fn(async () => {});
    const stopMix = vi.fn();
    const ports: CapturePorts = {
      captureDisplay: () => Promise.resolve(audioStream()),
      captureMic: () => Promise.resolve(audioStream()),
      mix: () =>
        Promise.resolve({
          stream: audioStream(),
          stop: stopMix,
        }),
      transcribe: {
        start: (_stream, onFinal) => {
          onFinal("こんにちは", new Date("2026-09-21T16:00:00.000Z"));
          return Promise.resolve({ stop: stopTranscribe });
        },
      },
      appendTranscript,
    };

    const result = await startMeetingCapture(ports);
    expect(result.status).toBe("started");
    expect(appendTranscript).toHaveBeenCalledWith(
      new Date("2026-09-21T16:00:00.000Z"),
      "こんにちは",
    );
    if (result.status === "started") {
      await result.stop();
    }
    expect(stopTranscribe).toHaveBeenCalled();
    expect(stopMix).toHaveBeenCalled();
  });

  it("fails when the tab has no audio track", async () => {
    const result = await startMeetingCapture({
      captureDisplay: () => Promise.resolve(silentStream()),
      captureMic: () => Promise.resolve(audioStream()),
      mix: () => {
        throw new Error("mix should not run");
      },
      transcribe: {
        start: () => {
          throw new Error("transcribe should not run");
        },
      },
      appendTranscript: () => {},
    });
    expect(result).toEqual({ status: "failed", reason: "no-tab-audio" });
  });

  it("fails when display capture is denied", async () => {
    const result = await startMeetingCapture({
      captureDisplay: () => Promise.reject(new Error("denied")),
      captureMic: () => Promise.resolve(audioStream()),
      mix: () => {
        throw new Error("mix should not run");
      },
      transcribe: {
        start: () => {
          throw new Error("transcribe should not run");
        },
      },
      appendTranscript: () => {},
    });
    expect(result).toEqual({ status: "failed", reason: "permission-denied" });
  });
});
