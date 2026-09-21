import { describe, expect, it } from "vitest";
import { captureFailureMessage, type CaptureFailure } from "./capturePhase";

describe("captureFailureMessage", () => {
  it("names each failure without mentioning speakers", () => {
    const reasons = [
      "permission-denied",
      "no-tab-audio",
      "transcribe-unavailable",
    ] as const satisfies readonly CaptureFailure[];
    expect(reasons.map(captureFailureMessage)).toEqual([
      "画面とマイクの共有が必要です",
      "タブの音声を共有してください",
      "文字起こしに接続できませんでした",
    ]);
  });
});
