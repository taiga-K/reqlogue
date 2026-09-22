"use client";

import { Circle, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  appendMeetingTranscript,
  clearMeeting,
  ensureMeeting,
  type MeetingId,
} from "@/entities/meeting";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { captureDisplay, captureMic } from "../lib/browserMedia";
import { mixTabAndMic } from "../lib/mixTabAndMic";
import { createTranscriber } from "../lib/ourApiTranscriber";
import { endMeeting } from "../lib/endMeeting";
import { startMeetingCapture } from "../lib/startMeetingCapture";
import {
  captureFailureMessage,
  type CapturePhase,
} from "../model/capturePhase";
import styles from "./StartMeetingControl.module.css";

type StartMeetingControlProps = {
  readonly meetingId: MeetingId;
};

export function StartMeetingControl({ meetingId }: StartMeetingControlProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<CapturePhase>({ status: "idle" });
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const stoppingRef = useRef<Promise<void> | null>(null);
  const liveRef = useRef(false);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      liveRef.current = false;
      const stopCapture = stopRef.current;
      stopRef.current = null;
      if (stopCapture !== null) {
        void stopCapture();
      }
    };
  }, []);

  async function releaseCapture() {
    if (stoppingRef.current !== null) {
      await stoppingRef.current;
      return;
    }
    const stopCapture = stopRef.current;
    if (stopCapture === null) {
      return;
    }
    stopRef.current = null;
    const stopping = stopCapture().finally(() => {
      stoppingRef.current = null;
    });
    stoppingRef.current = stopping;
    await stopping;
  }

  async function start() {
    setPhase({ status: "requesting" });
    liveRef.current = true;
    const startGate = { failed: false };
    ensureMeeting(meetingId);
    const result = await startMeetingCapture({
      captureDisplay,
      captureMic,
      mix: mixTabAndMic,
      transcribe: createTranscriber(),
      appendTranscript: (at, text) => {
        if (!liveRef.current) {
          return;
        }
        appendMeetingTranscript(meetingId, at, text);
      },
      onTranscribeFailure: () => {
        startGate.failed = true;
        void failRuntime();
      },
    });
    if (unmountedRef.current) {
      liveRef.current = false;
      if (result.status === "started") {
        await result.stop();
      }
      return;
    }
    switch (result.status) {
      case "started":
        stopRef.current = result.stop;
        if (startGate.failed) {
          await result.stop();
          return;
        }
        setPhase({ status: "capturing" });
        return;
      case "failed":
        liveRef.current = false;
        stopRef.current = null;
        setPhase({ status: "failed", reason: result.reason });
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function stop() {
    setPhase({ status: "ending" });
    const result = await endMeeting(meetingId, async () => {
      try {
        await releaseCapture();
      } catch {
        void 0;
      } finally {
        liveRef.current = false;
      }
    });
    if (unmountedRef.current) {
      return;
    }
    switch (result.status) {
      case "ended":
        router.push(`/session/${meetingId}/requirements`);
        return;
      case "failed":
        setPhase({ status: "unsummarized" });
        return;
      case "nothing-to-end":
        clearMeeting(meetingId);
        setPhase({ status: "idle" });
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function failRuntime() {
    if (!liveRef.current) {
      return;
    }
    liveRef.current = false;
    try {
      await releaseCapture();
    } catch {
      void 0;
    } finally {
      if (!unmountedRef.current) {
        setPhase({ status: "failed", reason: "transcribe-unavailable" });
      }
    }
  }

  async function onClick() {
    switch (phase.status) {
      case "idle":
      case "failed":
        await start();
        return;
      case "requesting":
        return;
      case "capturing":
      case "unsummarized":
        await stop();
        return;
      case "ending":
        return;
      default: {
        const _exhaustive: never = phase;
        return _exhaustive;
      }
    }
  }

  return (
    <div className={styles["launch"]}>
      <Button
        type="button"
        size="lg"
        className="rounded-full"
        disabled={phase.status === "requesting" || phase.status === "ending"}
        onClick={() => {
          void onClick();
        }}
      >
        {buttonContents(phase)}
      </Button>
      {phase.status === "failed" ? (
        <p className={styles["error"]} role="status">
          {captureFailureMessage(phase.reason)}
        </p>
      ) : null}
      {phase.status === "unsummarized" ? (
        <p className={styles["error"]} role="status">
          要件定義書を作れませんでした
        </p>
      ) : null}
    </div>
  );
}

function buttonContents(phase: CapturePhase): ReactNode {
  switch (phase.status) {
    case "requesting":
      return (
        <>
          <Spinner data-icon="inline-start" />
          会議を開始
        </>
      );
    case "ending":
      return (
        <>
          <Spinner data-icon="inline-start" />
          会議を終了
        </>
      );
    case "capturing":
    case "unsummarized":
      return (
        <>
          <Square data-icon="inline-start" />
          会議を終了
        </>
      );
    case "idle":
    case "failed":
      return (
        <>
          <Circle data-icon="inline-start" />
          会議を開始
        </>
      );
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}
