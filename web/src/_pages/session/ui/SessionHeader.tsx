import Image from "next/image";
import wordmark from "@/shared/ui/reqlogue-illustrated-wordmark.webp";
import styles from "./SessionHeader.module.css";

type SessionHeaderProps = {
  readonly name: string;
};

export function SessionHeader({ name }: SessionHeaderProps) {
  const heading = name.trim().length === 0 ? null : name;

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
