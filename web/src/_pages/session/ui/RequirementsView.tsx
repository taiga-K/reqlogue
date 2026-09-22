"use client";

import { useSyncExternalStore } from "react";
import {
  readRequirements,
  subscribeRequirements,
  type MeetingId,
} from "@/entities/meeting";
import { MeetingHeader } from "@/shared/ui/meeting-header";
import { RequirementsArticle } from "./RequirementsArticle";
import styles from "./RequirementsPage.module.css";
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
      <MeetingHeader name={document?.name ?? ""} />
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
