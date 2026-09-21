import {
  acceptAdviceItems,
  notifiedThemes,
  type AdviceDraft,
  type MeetingId,
  type MeetingRecord,
} from "@/entities/meeting";
import {
  BOUNDARY_WAIT_MS,
  QUIET_MS,
  isFillerOnly,
  offsetAfterPrefix,
  speechFromTranscript,
  takeSendablePrefix,
  unsentSlice,
} from "../model/mindmapUpdate";

export type AdviceUpdatePort = (input: {
  readonly meetingId: string;
  readonly transcriptDelta: string;
  readonly notifiedThemes: readonly string[];
}) => Promise<readonly AdviceDraft[]>;

type AdviceClock = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

const browserClock: AdviceClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => {
    clearTimeout(id as ReturnType<typeof setTimeout>);
  },
};

type SchedulerOptions = {
  readonly meetingId: MeetingId;
  readonly read: () => MeetingRecord | null;
  readonly save: (
    cards: MeetingRecord["adviceCards"],
    adviceSentTranscriptOffset: number,
  ) => void;
  readonly update: AdviceUpdatePort;
  readonly createId?: () => string;
  readonly clock?: AdviceClock;
};

export function createAdviceScheduler(options: SchedulerOptions): {
  notify: () => void;
  stop: () => void;
} {
  const clock = options.clock ?? browserClock;
  const createId = options.createId ?? (() => crypto.randomUUID());
  const abort = new AbortController();
  const live = {
    quietTimer: null as unknown,
    boundaryTimer: null as unknown,
    inFlight: false,
    stopped: false,
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
  return unsentSlice(record.transcript, record.adviceSentTranscriptOffset);
}

function prefixStillAnchored(transcript: string, from: number, prefix: string): boolean {
  return unsentSlice(transcript, from).startsWith(prefix);
}

  function enqueueSend(prefix: string) {
    live.sending = live.sending.then(async () => {
      await sendPrefix(prefix);
    });
  }

  function settleLeftover(transcriptLengthAtSend: number) {
    const latest = options.read();
    if (latest === null) {
      return;
    }
    const leftover = unsentOf(latest);
    if (leftover.length === 0) {
      return;
    }
    if (latest.transcript.length > transcriptLengthAtSend) {
      const next = takeSendablePrefix(leftover, "force");
      if (next !== null) {
        enqueueSend(next);
      }
      return;
    }
    notify();
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
      return;
    }
    const record = options.read();
    if (record === null) {
      return;
    }
    live.inFlight = true;
    clearTimers();
    const sentFrom = record.adviceSentTranscriptOffset;
    const transcriptLengthAtSend = record.transcript.length;
    let sent = false;
    let dropped = false;
    try {
      const items = await options.update({
        meetingId: options.meetingId,
        transcriptDelta: speech,
        notifiedThemes: notifiedThemes(record.adviceCards),
      });
      const latest = options.read();
      if (latest === null || !prefixStillAnchored(latest.transcript, sentFrom, prefix)) {
        dropped = true;
        return;
      }
      const added = acceptAdviceItems(latest.adviceCards, items, createId);
      options.save(
        added.length === 0 ? latest.adviceCards : [...latest.adviceCards, ...added],
        offsetAfterPrefix(latest.transcript, sentFrom, prefix),
      );
      sent = true;
    } catch {
      if (!live.stopped) {
        armBoundary(prefix);
      }
      return;
    } finally {
      live.inFlight = false;
      if (sent) {
        settleLeftover(transcriptLengthAtSend);
      } else if (dropped && !live.stopped) {
        notify();
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
    live.stopped = true;
    abort.abort();
    clearTimers();
  }

  return { notify, stop };
}
