import type { MeetingId, MeetingRecord } from "@/entities/meeting";
import {
  BOUNDARY_WAIT_MS,
  QUIET_MS,
  isFillerOnly,
  offsetAfterPrefix,
  speechFromTranscript,
  takeSendablePrefix,
  unsentSlice,
} from "../model/mindmapUpdate";

export type MindmapUpdatePort = (input: {
  readonly meetingId: string;
  readonly previousMarkdown: string;
  readonly transcriptDelta: string;
}) => Promise<string>;

export type MindmapClock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

const browserClock: MindmapClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => {
    clearTimeout(id as ReturnType<typeof setTimeout>);
  },
};

type SchedulerOptions = {
  readonly meetingId: MeetingId;
  readonly read: () => MeetingRecord | null;
  readonly save: (markdown: string, sentTranscriptOffset: number) => void;
  readonly update: MindmapUpdatePort;
  readonly clock?: MindmapClock;
};

export function createMindmapScheduler(options: SchedulerOptions): {
  notify: () => void;
  stop: () => void;
} {
  const clock = options.clock ?? browserClock;
  const abort = new AbortController();
  const live = {
    quietTimer: null as unknown,
    boundaryTimer: null as unknown,
    inFlight: false,
    pendingAfterFlight: false,
    sending: Promise.resolve(),
  };

  function clearTimers() {
    if (live.quietTimer !== null) {
      clock.clearTimeout(live.quietTimer);
      live.quietTimer = null;
    }
    if (live.boundaryTimer !== null) {
      clock.clearTimeout(live.boundaryTimer);
      live.boundaryTimer = null;
    }
  }

  function unsentOf(record: MeetingRecord): string {
    return unsentSlice(record.transcript, record.sentTranscriptOffset);
  }

  function enqueueSend(prefix: string) {
    live.sending = live.sending.then(async () => {
      await sendPrefix(prefix);
    });
  }

  async function sendPrefix(prefix: string) {
    if (abort.signal.aborted || prefix.length === 0) {
      return;
    }
    const speech = speechFromTranscript(prefix);
    if (isFillerOnly(speech)) {
      return;
    }
    if (live.inFlight) {
      live.pendingAfterFlight = true;
      return;
    }
    const record = options.read();
    if (record === null) {
      return;
    }
    live.inFlight = true;
    clearTimers();
    const sentFrom = record.sentTranscriptOffset;
    try {
      const markdown = await options.update({
        meetingId: options.meetingId,
        previousMarkdown: record.mindmapMarkdown,
        transcriptDelta: speech,
      });
      const latest = options.read();
      if (latest === null) {
        return;
      }
      options.save(markdown, offsetAfterPrefix(latest.transcript, sentFrom, prefix));
    } catch {
      return;
    } finally {
      live.inFlight = false;
      if (live.pendingAfterFlight) {
        live.pendingAfterFlight = false;
        const latest = options.read();
        if (latest !== null) {
          const leftover = unsentOf(latest);
          const next = takeSendablePrefix(leftover, "force");
          if (next !== null) {
            enqueueSend(next);
          }
        }
      }
    }
  }

  function armQuiet(unsent: string) {
    if (live.quietTimer !== null) {
      clock.clearTimeout(live.quietTimer);
    }
    live.quietTimer = clock.setTimeout(() => {
      live.quietTimer = null;
      const prefix = takeSendablePrefix(unsent, "quiet");
      if (prefix !== null) {
        enqueueSend(prefix);
      }
    }, QUIET_MS);
  }

  function armBoundary(unsent: string) {
    if (live.boundaryTimer !== null) {
      return;
    }
    live.boundaryTimer = clock.setTimeout(() => {
      live.boundaryTimer = null;
      const prefix = takeSendablePrefix(unsent, "force");
      if (prefix !== null) {
        enqueueSend(prefix);
      }
    }, BOUNDARY_WAIT_MS);
  }

  function notify() {
    if (abort.signal.aborted) {
      return;
    }
    const record = options.read();
    if (record === null) {
      clearTimers();
      return;
    }
    const unsent = unsentOf(record);
    if (unsent.length === 0) {
      clearTimers();
      return;
    }
    if (live.inFlight) {
      live.pendingAfterFlight = true;
      return;
    }
    if (isFillerOnly(speechFromTranscript(unsent))) {
      clearTimers();
      return;
    }
    const prefix = takeSendablePrefix(unsent, "crossed");
    if (prefix !== null) {
      clearTimers();
      enqueueSend(prefix);
      return;
    }
    if (takeSendablePrefix(unsent, "quiet") === null) {
      clearTimers();
      armBoundary(unsent);
      return;
    }
    if (live.boundaryTimer !== null) {
      clock.clearTimeout(live.boundaryTimer);
      live.boundaryTimer = null;
    }
    armQuiet(unsent);
  }

  function stop() {
    abort.abort();
    clearTimers();
  }

  return { notify, stop };
}
