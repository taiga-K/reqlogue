import type { Metadata } from "next";
import Link from "next/link";
import { cssClass } from "@/shared/lib";
import styles from "./home-page.module.css";

export const metadata: Metadata = {
  title: "reqlogue",
  description: "要件定義ヒアリング用AIエージェント",
};

export function HomePage() {
  return (
    <main className={cssClass(styles, "page")}>
      <h1>reqlogue</h1>
      <p className={cssClass(styles, "lead")}>
        会議音声をリアルタイムで文字起こしし、マインドマップを更新し、曖昧・矛盾・漏れを助言したあと、Markdownの要件定義書を書き出します。
      </p>
      <ul className={cssClass(styles, "capabilities")}>
        <li>GPT-Realtime-Whisper によるリアルタイム文字起こし</li>
        <li>OrcaRouter によるライブマインドマップ</li>
        <li>曖昧・矛盾・漏れの検出と確認促し</li>
        <li>会議後の Markdown 要件定義書</li>
      </ul>
      <Link className={cssClass(styles, "cta")} href="/meeting">
        デモ会議を開く
      </Link>
    </main>
  );
}
