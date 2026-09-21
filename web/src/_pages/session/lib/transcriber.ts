import type { TranscriptionPort } from "./startMeetingCapture";

export const STUB_TRANSCRIPT = "stub transcript";

export function createTranscriber(): TranscriptionPort {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return createStubTranscriber();
  }
  return createOpenAiRealtimeTranscriber();
}

function createStubTranscriber(): TranscriptionPort {
  return {
    start(_stream, onFinal) {
      onFinal(STUB_TRANSCRIPT, new Date());
      return Promise.resolve({
        stop: () => Promise.resolve(),
      });
    },
  };
}

function createOpenAiRealtimeTranscriber(): TranscriptionPort {
  return {
    async start(stream, onFinal) {
      const session = await fetchClientSecret();
      if (session.status === "unavailable") {
        throw new Error("transcription session unavailable");
      }

      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel("oai-events");
      channel.addEventListener("message", (event) => {
        if (typeof event.data !== "string") {
          return;
        }
        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        const transcript = transcriptFromCompletedEvent(payload);
        if (transcript === null) {
          return;
        }
        onFinal(transcript, new Date());
      });

      for (const track of stream.getAudioTracks()) {
        peer.addTrack(track, stream);
      }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIce(peer);
      const localSdp = peer.localDescription?.sdp;
      if (localSdp === undefined) {
        peer.close();
        throw new Error("missing local sdp");
      }

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: localSdp,
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpResponse.ok) {
        peer.close();
        throw new Error("realtime call failed");
      }

      const answer = await sdpResponse.text();
      await peer.setRemoteDescription({ type: "answer", sdp: answer });

      return {
        stop: () => {
          channel.close();
          peer.close();
          return Promise.resolve();
        },
      };
    },
  };
}

type ClientSecretResult =
  | { readonly status: "ready"; readonly clientSecret: string }
  | { readonly status: "unavailable" };

async function fetchClientSecret(): Promise<ClientSecretResult> {
  const response = await fetch("/api/transcription-session", { method: "POST" });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return { status: "unavailable" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  if (typeof value !== "object" || value === null) {
    return { status: "unavailable" };
  }
  if (
    !("clientSecret" in value) ||
    typeof value.clientSecret !== "string" ||
    value.clientSecret.length === 0
  ) {
    return { status: "unavailable" };
  }
  return { status: "ready", clientSecret: value.clientSecret };
}

function transcriptFromCompletedEvent(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (
    !("type" in value) ||
    value.type !== "conversation.item.input_audio_transcription.completed"
  ) {
    return null;
  }
  if (!("transcript" in value) || typeof value.transcript !== "string") {
    return null;
  }
  const transcript = value.transcript.trim();
  if (transcript.length === 0) {
    return null;
  }
  return transcript;
}

async function waitForIce(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") {
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      peer.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (peer.iceGatheringState === "complete") {
        done();
      }
    };
    peer.addEventListener("icegatheringstatechange", onChange);
    window.setTimeout(done, 2000);
  });
}
