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
import { pinMindmapRoot } from "../model/mindmapRoot";
import { SessionHeader } from "./SessionHeader";
import { SessionMindmap } from "./SessionMindmap";
import { StartMeetingControl } from "./StartMeetingControl";
import styles from "./SessionPage.module.css";

type SessionWorkspaceProps = {
  readonly meetingId: MeetingId;
};

export function SessionWorkspace({ meetingId }: SessionWorkspaceProps) {
  const name = useSyncExternalStore(
    subscribeMeetings,
    () => readMeeting(meetingId)?.name ?? "",
    () => "",
  );
  const mindmapMarkdown = useSyncExternalStore(
    subscribeMeetings,
    () => readMeeting(meetingId)?.mindmapMarkdown ?? "",
    () => "",
  );
  const shownMarkdown = pinMindmapRoot(mindmapMarkdown, name);

  useEffect(() => {
    if (shownMarkdown === mindmapMarkdown) {
      return;
    }
    const record = readMeeting(meetingId);
    if (record === null) {
      return;
    }
    saveMindmapProgress(meetingId, shownMarkdown, record.sentTranscriptOffset);
  }, [meetingId, mindmapMarkdown, shownMarkdown]);

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
      <SessionHeader name={name} />
      <main className={styles["main"]}>
        <SessionMindmap markdown={shownMarkdown} />
      </main>
      <StartMeetingControl meetingId={meetingId} />
    </>
  );
}
