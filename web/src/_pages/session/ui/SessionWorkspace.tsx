"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  moveAdviceCard,
  readMeeting,
  saveAdviceProgress,
  saveMindmapProgress,
  subscribeMeetings,
  type AdviceCard,
  type AdviceColumn,
  type MeetingId,
} from "@/entities/meeting";
import { createAdviceUpdater } from "../lib/ourApiAdvice";
import { createAdviceScheduler } from "../lib/adviceScheduler";
import { createMindmapUpdater } from "../lib/ourApiMindmap";
import { createMindmapScheduler } from "../lib/mindmapScheduler";
import { pinMindmapRoot } from "../model/mindmapRoot";
import { AdviceBoard } from "./AdviceBoard";
import { SessionHeader } from "./SessionHeader";
import { SessionMindmap } from "./SessionMindmap";
import { SessionRail, type SessionPane } from "./SessionRail";
import { StartMeetingControl } from "./StartMeetingControl";
import styles from "./SessionPage.module.css";

const EMPTY_ADVICE_CARDS: readonly AdviceCard[] = [];

type SessionWorkspaceProps = {
  readonly meetingId: MeetingId;
};

export function SessionWorkspace({ meetingId }: SessionWorkspaceProps) {
  const [pane, setPane] = useState<SessionPane>("mindmap");
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
  const adviceCards = useSyncExternalStore(
    subscribeMeetings,
    () => readMeeting(meetingId)?.adviceCards ?? EMPTY_ADVICE_CARDS,
    () => EMPTY_ADVICE_CARDS,
  );

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

  useEffect(() => {
    const scheduler = createAdviceScheduler({
      meetingId,
      read: () => readMeeting(meetingId),
      save: (cards, adviceSentTranscriptOffset) => {
        saveAdviceProgress(meetingId, cards, adviceSentTranscriptOffset);
      },
      update: createAdviceUpdater(),
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

  function moveCard(id: string, column: AdviceColumn) {
    const record = readMeeting(meetingId);
    if (record === null) {
      return;
    }
    saveAdviceProgress(
      meetingId,
      moveAdviceCard(record.adviceCards, id, column),
      record.adviceSentTranscriptOffset,
    );
  }

  return (
    <>
      <SessionHeader name={name} />
      <div className={styles["body"]}>
        <SessionRail pane={pane} onSelect={setPane} />
        <main className={styles["main"]}>
          <div className={styles["stage"]}>
            <div className={paneClass(pane, "mindmap")}>
              <SessionMindmap markdown={shownMarkdown} />
            </div>
            <div className={paneClass(pane, "advice")}>
              <AdviceBoard cards={adviceCards} onMove={moveCard} />
            </div>
          </div>
        </main>
      </div>
      <StartMeetingControl meetingId={meetingId} />
    </>
  );
}

function paneClass(active: SessionPane, pane: SessionPane): string | undefined {
  switch (active) {
    case "mindmap":
    case "advice":
      return active === pane ? styles["pane"] : styles["paneHidden"];
    default: {
      const _exhaustive: never = active;
      return _exhaustive;
    }
  }
}
