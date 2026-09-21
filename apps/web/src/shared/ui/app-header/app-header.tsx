import Link from "next/link";
import { cssClass } from "@/shared/lib";
import styles from "./app-header.module.css";

export function AppHeader() {
  return (
    <header className={cssClass(styles, "header")}>
      <Link className={cssClass(styles, "brand")} href="/">
        reqlogue
      </Link>
      <p className={cssClass(styles, "tagline")}>要件定義ヒアリング用AIエージェント</p>
    </header>
  );
}
