import Image from "next/image";
import wordmark from "@/shared/ui/reqlogue-illustrated-wordmark.webp";
import type { SessionMeeting } from "../model/sessionMeeting";
import styles from "./SessionHeader.module.css";

type SessionHeaderProps = {
  readonly meeting: SessionMeeting;
};

export function SessionHeader({ meeting }: SessionHeaderProps) {
  let heading: string | null;
  switch (meeting.status) {
    case "blank":
      heading = null;
      break;
    case "named":
      heading = meeting.name;
      break;
    default: {
      const _exhaustive: never = meeting;
      return _exhaustive;
    }
  }

  return (
    <header className={styles["banner"]}>
      <Image
        src={wordmark}
        alt="reqlogue"
        priority
        className={styles["mark"]}
      />
      {heading === null ? null : <h1 className={styles["name"]}>{heading}</h1>}
    </header>
  );
}
