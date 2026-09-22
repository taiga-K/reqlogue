import Image from "next/image";
import wordmark from "@/shared/ui/reqlogue-illustrated-wordmark.webp";
import styles from "./meeting-header.module.css";

type MeetingHeaderProps = {
  readonly name: string;
};

export function MeetingHeader({ name }: MeetingHeaderProps) {
  const heading = name.trim().length === 0 ? null : name;

  return (
    <header className={styles["banner"]}>
      <Image
        src={wordmark}
        alt="reqlogue"
        priority
        className={styles["mark"]}
      />
      {heading === null ? null : (
        <>
          <span className={styles["rule"]} aria-hidden="true" />
          <h1 className={styles["name"]}>{heading}</h1>
        </>
      )}
    </header>
  );
}
