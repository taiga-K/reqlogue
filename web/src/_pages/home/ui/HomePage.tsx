import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { HomeFlowArt } from "./HomeFlowArt";
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
          <Link
            href="/prepare"
            className={buttonVariants({
              size: "lg",
              className: `${styles["start"] ?? ""} h-[max(3rem,calc(4.9*var(--s)))] w-[calc(25.3*var(--s))] max-w-full rounded-full`,
            })}
          >
            はじめる
            <ArrowRight data-icon="inline-end" />
          </Link>
        </section>
        <HomeFlowArt />
      </main>
    </div>
  );
}
