"use client";

import { Circle, Square } from "lucide-react";
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
import { startMeetingCapture } from "../lib/startMeetingCapture";
import { createTranscriber } from "../lib/transcriber";
import {
  captureFailureMessage,
  type CapturePhase,
} from "../model/capturePhase";
import styles from "./StartMeetingControl.module.css";

type StartMeetingControlProps = {
  readonly meetingId: MeetingId;
};

export function StartMeetingControl({ meetingId }: StartMeetingControlProps) {
  const [phase, setPhase] = useState<CapturePhase>({ status: "idle" });
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    return () => {
      void stopRef.current?.();
      stopRef.current = null;
    };
  }, []);

  async function start() {
    setPhase({ status: "requesting" });
    ensureMeeting(meetingId);
    const result = await startMeetingCapture({
      captureDisplay,
      captureMic,
      mix: mixTabAndMic,
      transcribe: createTranscriber(),
      appendTranscript: (at, text) => {
        appendMeetingTranscript(meetingId, at, text);
      },
    });
    switch (result.status) {
      case "started":
        stopRef.current = result.stop;
        setPhase({ status: "capturing" });
        return;
      case "failed":
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
    const stopCapture = stopRef.current;
    stopRef.current = null;
    if (stopCapture !== null) {
      await stopCapture();
    }
    clearMeeting(meetingId);
    setPhase({ status: "idle" });
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
        await stop();
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
        disabled={phase.status === "requesting"}
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
    case "capturing":
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
