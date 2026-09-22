import {
  readMeeting,
  saveMindmapProgress,
  type MeetingId,
} from "@/entities/meeting";
import { pinMindmapRoot } from "../model/mindmapRoot";
import { STUB_MINDMAP_MARKDOWN, postMindmapAudio } from "./ourApiMindmap";
import { startPcmChunks } from "./pcmChunks";
import { createSpeechBuffer } from "./speechBuffer";
import type { TranscriptionPort } from "./startMeetingCapture";

export const STUB_TRANSCRIPT = "stub transcript";

export function createHearing(meetingId: MeetingId): TranscriptionPort {
  if (process.env["NEXT_PUBLIC_API_MOCKING"] === "enabled") {
    return createStubHearing(meetingId);
  }
  return createOurApiHearing(meetingId);
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

export function createStubHearing(meetingId: MeetingId): TranscriptionPort {
  return {
    start(_stream, onFinal) {
      onFinal(STUB_TRANSCRIPT, new Date());
      const record = readMeeting(meetingId);
      if (record !== null) {
        saveMindmapProgress(
          meetingId,
          pinMindmapRoot(STUB_MINDMAP_MARKDOWN, record.name),
          record.transcript.length,
        );
      }
      return Promise.resolve({
        stop: () => Promise.resolve(),
      });
    },
  };
}

export { apiBaseUrl } from "./apiBaseUrl";

export function createOurApiHearing(meetingId: MeetingId): TranscriptionPort {
  return {
    async start(stream, onFinal, onFailure) {
      let epoch = 0;
      let closed = false;
      let draining = false;
      let chain: Promise<void> = Promise.resolve();
      const buffer = createSpeechBuffer();

      const deliver = async (pcm: ArrayBuffer, spokenAt: Date): Promise<void> => {
        const started = epoch;
        try {
          const previous = readMeeting(meetingId)?.mindmapMarkdown ?? "";
          const turn = await postMindmapAudio({
            meetingId,
            previousMarkdown: previous,
            audio: pcm,
          });
          if (started !== epoch) {
            return;
          }
          if (turn.transcript.length > 0) {
            onFinal(turn.transcript, spokenAt);
          }
          const latest = readMeeting(meetingId);
          if (latest === null) {
            return;
          }
          const markdown =
            turn.markdown.length === 0
              ? latest.mindmapMarkdown
              : pinMindmapRoot(turn.markdown, latest.name);
          saveMindmapProgress(meetingId, markdown, latest.transcript.length);
        } catch {
          if (started !== epoch || draining) {
            return;
          }
          epoch += 1;
          queueMicrotask(() => {
            onFailure();
          });
        }
      };

      const enqueue = (pcm: ArrayBuffer, spokenAt: Date): void => {
        chain = chain.then(() => deliver(pcm, spokenAt));
      };

      const pump = await startPcmChunks(stream, (pcm) => {
        if (closed) {
          return;
        }
        const speech = buffer.push(pcm);
        if (speech === null) {
          return;
        }
        enqueue(speech, new Date());
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
              const rest = buffer.flush();
              if (rest !== null && !closed) {
                enqueue(rest, new Date());
                await settleChain();
              }
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
