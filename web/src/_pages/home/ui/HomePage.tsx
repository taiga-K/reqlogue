import type { Metadata } from "next";
import Image from "next/image";
import { reqlogueIllustratedWordmark } from "@/shared/ui";
import { HomeArt } from "./HomeArt";
import { MeetingNameField } from "./MeetingNameField";
import { homeCopy } from "./home-copy";
import styles from "./HomePage.module.css";

export const metadata: Metadata = {
  title: "reqlogue",
  description: homeCopy.lead,
};

export function HomePage() {
  return (
    <div className={styles["page"]}>
      <header className={styles["header"]}>
        <Image
          className={styles["wordmark"]}
          src={reqlogueIllustratedWordmark}
          alt={homeCopy.brandAlt}
          priority
        />
      </header>
      <main className={styles["hero"]}>
        <section className={styles["copy"]}>
          <h1 className={styles["title"]}>{homeCopy.title}</h1>
          <p className={styles["lead"]}>{homeCopy.lead}</p>
          <p className={styles["body"]}>{homeCopy.afterMeeting}</p>
          <p className={styles["body"]}>{homeCopy.besideMeet}</p>
          <MeetingNameField />
        </section>
        <HomeArt />
      </main>
    </div>
  );
}
