import type { Metadata } from "next";
import { HomeFlowArt } from "./HomeFlowArt";
import { HomeHeader } from "./HomeHeader";
import { MeetingNameForm } from "./MeetingNameForm";
import styles from "./HomePage.module.css";

export const metadata: Metadata = {
  title: "reqlogue",
  description: "要件定義ヒアリングを支援する AI エージェント",
};

export function HomePage() {
  return (
    <div className={styles["page"]}>
      <HomeHeader />
      <main className={styles["main"]}>
        <section className={styles["invitation"]} aria-labelledby="home-headline">
          <h1 id="home-headline" className={styles["headline"]}>
            話すことに、集中しよう。
          </h1>
          <p className={styles["lead"]}>あなたの会議に、ちいさな相棒。</p>
          <p className={styles["body"]}>
            会議が終わるころには、要件のまとめができています。reqlogue
            を会議のとなりに置いて、はじめましょう。
          </p>
          <MeetingNameForm />
        </section>
        <HomeFlowArt />
      </main>
    </div>
  );
}
