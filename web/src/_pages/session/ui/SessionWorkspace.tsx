"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  readMeeting,
  saveMindmapProgress,
  subscribeMeetings,
  type MeetingId,
} from "@/entities/meeting";
import { createMindmapUpdater } from "../lib/ourApiMindmap";
import { createMindmapScheduler } from "../lib/mindmapScheduler";
import { SessionHeader } from "./SessionHeader";
import { SessionMindmap } from "./SessionMindmap";
import { StartMeetingControl } from "./StartMeetingControl";
import styles from "./SessionPage.module.css";

type SessionWorkspaceProps = {
  readonly meetingId: MeetingId;
};

export function SessionWorkspace({ meetingId }: SessionWorkspaceProps) {
  const record = useSyncExternalStore(
    subscribeMeetings,
    () => readMeeting(meetingId),
    () => null,
  );

  useEffect(() => {
    const scheduler = createMindmapScheduler({
      meetingId,
      read: () => readMeeting(meetingId),
      save: (markdown, sentTranscriptOffset) => {
        saveMindmapProgress(meetingId, markdown, sentTranscriptOffset);
      },
      update: createMindmapUpdater(),
    });
    const unsubscribe = subscribeMeetings(() => {
      scheduler.notify();
    });
    scheduler.notify();
    return () => {
      unsubscribe();
      scheduler.stop();
    };
  }, [meetingId]);

  return (
    <>
      <SessionHeader name={record?.name ?? ""} />
      <main className={styles["main"]}>
        <SessionMindmap markdown={record?.mindmapMarkdown ?? ""} />
      </main>
      <StartMeetingControl meetingId={meetingId} />
    </>
  );
}
