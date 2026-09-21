import Image from "next/image";
import wordmark from "@/shared/ui/reqlogue-illustrated-wordmark.webp";
import type { SessionMeeting } from "../model/sessionMeeting";
import styles from "./SessionHeader.module.css";

type SessionHeaderProps = {
  readonly meeting: SessionMeeting;
};

export function SessionHeader({ meeting }: SessionHeaderProps) {
  return (
    <header className={styles["banner"]}>
      <Image
        src={wordmark}
        alt="reqlogue"
        priority
        className={styles["mark"]}
      />
      <MeetingTitle meeting={meeting} />
    </header>
  );
}

function MeetingTitle({ meeting }: SessionHeaderProps) {
  switch (meeting.status) {
    case "blank":
      return null;
    case "named":
      return <h1 className={styles["name"]}>{meeting.name}</h1>;
    default: {
      const _exhaustive: never = meeting;
      return _exhaustive;
    }
  }
}
