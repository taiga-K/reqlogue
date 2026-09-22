export type CaptureFailure =
  | "permission-denied"
  | "no-tab-audio"
  | "transcribe-unavailable";

export type CapturePhase =
  | { readonly status: "idle" }
  | { readonly status: "requesting" }
  | { readonly status: "capturing" }
  | { readonly status: "ending" }
  | { readonly status: "unsummarized" }
  | { readonly status: "failed"; readonly reason: CaptureFailure };

export function captureFailureMessage(reason: CaptureFailure): string {
  switch (reason) {
    case "permission-denied":
      return "画面とマイクの共有が必要です";
    case "no-tab-audio":
      return "タブの音声を共有してください";
    case "transcribe-unavailable":
      return "文字起こしに接続できませんでした";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}
