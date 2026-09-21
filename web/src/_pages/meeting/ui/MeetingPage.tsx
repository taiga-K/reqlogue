import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  MEETING_NAME_PARAM,
  draftFromParam,
} from "@/shared/model";
import styles from "./MeetingPage.module.css";

type MeetingPageProps = {
  readonly searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
};

export async function generateMetadata({
  searchParams,
}: MeetingPageProps): Promise<Metadata> {
  const draft = draftFromParam((await searchParams)[MEETING_NAME_PARAM]);

  switch (draft.status) {
    case "ready":
      return { title: `${draft.name} · reqlogue` };
    case "blank":
      return { title: "reqlogue" };
    default: {
      const _exhaustive: never = draft;
      return _exhaustive;
    }
  }
}

export async function MeetingPage({ searchParams }: MeetingPageProps) {
  const draft = draftFromParam((await searchParams)[MEETING_NAME_PARAM]);

  switch (draft.status) {
    case "blank":
      return redirect("/");
    case "ready":
      return (
        <section className={styles["screen"]} aria-labelledby="meeting-title">
          <p className={styles["eyebrow"]}>会議のなまえ</p>
          <h1 id="meeting-title" className={styles["title"]}>
            {draft.name}
          </h1>
        </section>
      );
    default: {
      const _exhaustive: never = draft;
      return _exhaustive;
    }
  }
}
