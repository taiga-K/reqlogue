import type { CaptureFailure } from "../model/capturePhase";
import type { MixedCapture } from "./mixTabAndMic";

export type TranscriptionHandle = {
  stop: () => Promise<void>;
};

export type TranscriptionPort = {
  start: (
    stream: MediaStream,
    onFinal: (text: string, at: Date) => void,
    onFailure: () => void,
  ) => Promise<TranscriptionHandle>;
};

export type CapturePorts = {
  captureDisplay: () => Promise<MediaStream>;
  captureMic: () => Promise<MediaStream>;
  mix: (tab: MediaStream, mic: MediaStream) => Promise<MixedCapture>;
  transcribe: TranscriptionPort;
  appendTranscript: (at: Date, text: string) => void;
  onTranscribeFailure: () => void;
};

export type CaptureStartResult =
  | { readonly status: "started"; stop: () => Promise<void> }
  | { readonly status: "failed"; readonly reason: CaptureFailure };

export async function startMeetingCapture(
  ports: CapturePorts,
): Promise<CaptureStartResult> {
  let tab: MediaStream | undefined;
  let mic: MediaStream | undefined;
  try {
    tab = await ports.captureDisplay();
    if (tab.getAudioTracks().length === 0) {
      stopTracks(tab);
      return { status: "failed", reason: "no-tab-audio" };
    }
    mic = await ports.captureMic();
  } catch {
    if (tab !== undefined) {
      stopTracks(tab);
    }
    if (mic !== undefined) {
      stopTracks(mic);
    }
    return { status: "failed", reason: "permission-denied" };
  }

  let mixed: MixedCapture | undefined;
  try {
    const mixedCapture = await ports.mix(tab, mic);
    mixed = mixedCapture;
    const session: { handle?: TranscriptionHandle } = {};
    let inflight: Promise<void> | undefined;
    const stopAll = () => {
      if (inflight !== undefined) {
        return inflight;
      }
      inflight = (async () => {
        mixedCapture.stop();
        await session.handle?.stop();
      })();
      return inflight;
    };
    session.handle = await ports.transcribe.start(
      mixedCapture.stream,
      (text, at) => {
        ports.appendTranscript(at, text);
      },
      () => {
        void stopAll().finally(() => {
          ports.onTranscribeFailure();
        });
      },
    );
    return {
      status: "started",
      stop: stopAll,
    };
  } catch {
    mixed?.stop();
    stopTracks(tab);
    stopTracks(mic);
    return { status: "failed", reason: "transcribe-unavailable" };
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
