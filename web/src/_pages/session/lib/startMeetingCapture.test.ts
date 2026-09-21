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

function ports(overrides: Partial<CapturePorts> = {}): CapturePorts {
  return {
    captureDisplay: () => Promise.resolve(audioStream()),
    captureMic: () => Promise.resolve(audioStream()),
    mix: () =>
      Promise.resolve({
        stream: audioStream(),
        stop() {},
      }),
    transcribe: {
      start: () => Promise.resolve({ stop: async () => {} }),
    },
    appendTranscript: () => {},
    onTranscribeFailure: () => {},
    ...overrides,
  };
}

describe("startMeetingCapture", () => {
  it("starts when tab audio and transcription are available", async () => {
    const appendTranscript = vi.fn();
    const stopTranscribe = vi.fn(() => Promise.resolve());
    const stopMix = vi.fn();
    const result = await startMeetingCapture(
      ports({
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
      }),
    );
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
    const result = await startMeetingCapture(
      ports({
        captureDisplay: () => Promise.resolve(silentStream()),
        mix: () => {
          throw new Error("mix should not run");
        },
        transcribe: {
          start: () => {
            throw new Error("transcribe should not run");
          },
        },
      }),
    );
    expect(result).toEqual({ status: "failed", reason: "no-tab-audio" });
  });

  it("fails when display capture is denied", async () => {
    const result = await startMeetingCapture(
      ports({
        captureDisplay: () => Promise.reject(new Error("denied")),
        mix: () => {
          throw new Error("mix should not run");
        },
        transcribe: {
          start: () => {
            throw new Error("transcribe should not run");
          },
        },
      }),
    );
    expect(result).toEqual({ status: "failed", reason: "permission-denied" });
  });

  it("releases mixed media when transcribe stop rejects", async () => {
    const stopMix = vi.fn();
    const result = await startMeetingCapture(
      ports({
        mix: () =>
          Promise.resolve({
            stream: audioStream(),
            stop: stopMix,
          }),
        transcribe: {
          start: () =>
            Promise.resolve({
              stop: () => Promise.reject(new Error("stop failed")),
            }),
        },
      }),
    );
    expect(result.status).toBe("started");
    if (result.status === "started") {
      await expect(result.stop()).rejects.toThrow("stop failed");
    }
    expect(stopMix).toHaveBeenCalled();
  });

  it("stops capture when transcription fails at runtime", async () => {
    const stopMix = vi.fn();
    const stopTranscribe = vi.fn(() => Promise.resolve());
    const onTranscribeFailure = vi.fn();
    let fail: (() => void) | undefined;
    const result = await startMeetingCapture(
      ports({
        mix: () =>
          Promise.resolve({
            stream: audioStream(),
            stop: stopMix,
          }),
        transcribe: {
          start: (_stream, _onFinal, onFailure) => {
            fail = onFailure;
            return Promise.resolve({ stop: stopTranscribe });
          },
        },
        onTranscribeFailure,
      }),
    );
    expect(result.status).toBe("started");
    fail?.();
    await vi.waitFor(() => {
      expect(stopTranscribe).toHaveBeenCalled();
      expect(stopMix).toHaveBeenCalled();
      expect(onTranscribeFailure).toHaveBeenCalled();
    });
  });

  it("releases media only once when stop is called again after unmount", async () => {
    const stopMix = vi.fn();
    const stopTranscribe = vi.fn(() => Promise.resolve());
    const result = await startMeetingCapture(
      ports({
        mix: () =>
          Promise.resolve({
            stream: audioStream(),
            stop: stopMix,
          }),
        transcribe: {
          start: () => Promise.resolve({ stop: stopTranscribe }),
        },
      }),
    );
    expect(result.status).toBe("started");
    if (result.status === "started") {
      await result.stop();
      await result.stop();
    }
    expect(stopTranscribe).toHaveBeenCalledTimes(1);
    expect(stopMix).toHaveBeenCalledTimes(1);
  });

  it("releases tab and mic before the transcriber HTTP drain finishes", async () => {
    const stopMix = vi.fn();
    const held: { resolve?: () => void } = {};
    const result = await startMeetingCapture(
      ports({
        mix: () =>
          Promise.resolve({
            stream: audioStream(),
            stop: stopMix,
          }),
        transcribe: {
          start: () =>
            Promise.resolve({
              stop: () =>
                new Promise<void>((resolve) => {
                  held.resolve = resolve;
                }),
            }),
        },
      }),
    );
    expect(result.status).toBe("started");
    if (result.status !== "started") {
      return;
    }
    const stopping = result.stop();
    await vi.waitFor(() => {
      expect(stopMix).toHaveBeenCalled();
    });
    const second = result.stop();
    expect(stopMix).toHaveBeenCalledTimes(1);
    held.resolve?.();
    await Promise.all([stopping, second]);
  });
});
