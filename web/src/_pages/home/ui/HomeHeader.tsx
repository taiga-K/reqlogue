import Image from "next/image";
import type { StaticImageData } from "next/image";
import wordmark from "@/shared/ui/reqlogue-illustrated-wordmark.webp";
import styles from "./HomeHeader.module.css";

type BrandIdentity = {
  readonly mark: StaticImageData;
  readonly name: "reqlogue";
};

const REQLOGUE = { mark: wordmark, name: "reqlogue" } as const satisfies BrandIdentity;

export function HomeHeader() {
  return (
    <header className={styles["banner"]}>
      <Image
        src={REQLOGUE.mark}
        alt={REQLOGUE.name}
        priority
        className={styles["mark"]}
      />
      <div className={styles["rule"]} aria-hidden="true">
        <span className={styles["ruleLine"]} />
        <span className={styles["ruleDots"]}>
          <span />
          <span />
          <span />
        </span>
      </div>
    </header>
  );
}
