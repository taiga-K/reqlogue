import type { Metadata } from "next";
import { MeetingHeader } from "@/shared/ui/meeting-header";
import { PrepareArt } from "./PrepareArt";
import { PrepareForm } from "./PrepareForm";
import styles from "./PreparePage.module.css";

export const metadata: Metadata = {
  title: "reqlogue",
  description: "要件定義ヒアリングを支援する AI エージェント",
};

export function PreparePage() {
  return (
    <div className={styles["page"]}>
      <MeetingHeader name="" />
      <main className={styles["main"]}>
        <section className={styles["invitation"]} aria-labelledby="prepare-headline">
          <h1 id="prepare-headline" className={styles["headline"]}>
            会議の準備をしましょう
          </h1>
          <p className={styles["lead"]}>会議名と概要を入力してください。</p>
          <PrepareForm />
        </section>
        <PrepareArt />
      </main>
    </div>
  );
}
