"use client";

import { useSyncExternalStore } from "react";
import {
  readMeeting,
  subscribeMeetings,
  type MeetingId,
} from "@/entities/meeting";
import { SessionHeader } from "./SessionHeader";
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

  return (
    <>
      <SessionHeader name={name} />
      <main className={styles["main"]} />
      <StartMeetingControl meetingId={meetingId} />
    </>
  );
}
