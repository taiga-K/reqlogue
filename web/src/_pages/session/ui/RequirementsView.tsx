"use client";

import { useSyncExternalStore } from "react";
import {
  readRequirements,
  subscribeRequirements,
  type MeetingId,
} from "@/entities/meeting";
import { RequirementsArticle } from "./RequirementsArticle";
import styles from "./RequirementsPage.module.css";
import { SessionHeader } from "./SessionHeader";
import pageStyles from "./SessionPage.module.css";

type RequirementsViewProps = {
  readonly meetingId: MeetingId;
};

export function RequirementsView({ meetingId }: RequirementsViewProps) {
  const document = useSyncExternalStore(
    subscribeRequirements,
    () => readRequirements(meetingId),
    () => null,
  );

  return (
    <>
      <SessionHeader name={document?.name ?? ""} />
      <main className={pageStyles["main"]}>
        {document === null ? (
          <p className={styles["missing"]}>
            この会議の要件定義書はまだありません。
          </p>
        ) : (
          <RequirementsArticle markdown={document.markdown} />
        )}
      </main>
    </>
  );
}
