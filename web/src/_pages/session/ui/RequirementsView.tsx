"use client";

import { useRef, useSyncExternalStore } from "react";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Outline, useOutlineFromMarkdown } from "@astryxdesign/core/Outline";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import {
  readRequirements,
  subscribeRequirements,
  type MeetingId,
} from "@/entities/meeting";
import { MeetingHeader } from "@/shared/ui/meeting-header";
import styles from "./RequirementsPage.module.css";
import pageStyles from "./SessionPage.module.css";

type RequirementsViewProps = {
  readonly meetingId: MeetingId;
};

type RequirementsSheetProps = {
  readonly markdown: string;
};

function RequirementsSheet({ markdown }: RequirementsSheetProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const items = useOutlineFromMarkdown(markdown);

  return (
    <Theme theme={neutralTheme} mode="light">
      <div className={styles["sheet"]}>
        {items.length > 0 ? (
          <aside className={styles["outline"]}>
            <Outline
              items={items}
              scrollContainerRef={documentRef}
              label="見出し"
            />
          </aside>
        ) : null}
        <div ref={documentRef} className={styles["document"]}>
          <Markdown>{markdown}</Markdown>
        </div>
      </div>
    </Theme>
  );
}

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
          <RequirementsSheet markdown={document.markdown} />
        )}
      </main>
    </>
  );
}
