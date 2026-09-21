import type { Metadata } from "next";
import { HomeHeader } from "./HomeHeader";
import styles from "./HomePage.module.css";

export const metadata: Metadata = {
  title: "reqlogue",
  description: "要件定義ヒアリングを支援する AI エージェント",
};

export function HomePage() {
  return (
    <div className={styles["page"]}>
      <HomeHeader />
      <main />
    </div>
  );
}
