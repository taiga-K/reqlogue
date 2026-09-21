import type { Metadata } from "next";
import {
  SESSION_NAME_PARAM,
  sessionMeetingFromParam,
} from "../model/sessionMeeting";
import { SessionHeader } from "./SessionHeader";
import styles from "./SessionPage.module.css";

type SessionPageProps = {
  readonly searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
};

export async function generateMetadata({
  searchParams,
}: SessionPageProps): Promise<Metadata> {
  const meeting = sessionMeetingFromParam(
    (await searchParams)[SESSION_NAME_PARAM],
  );

  switch (meeting.status) {
    case "named":
      return { title: `${meeting.name} · reqlogue` };
    case "blank":
      return { title: "reqlogue" };
    default: {
      const _exhaustive: never = meeting;
      return _exhaustive;
    }
  }
}

export async function SessionPage({ searchParams }: SessionPageProps) {
  const meeting = sessionMeetingFromParam(
    (await searchParams)[SESSION_NAME_PARAM],
  );

  return (
    <div className={styles["page"]}>
      <SessionHeader meeting={meeting} />
      <main className={styles["main"]} />
    </div>
  );
}
