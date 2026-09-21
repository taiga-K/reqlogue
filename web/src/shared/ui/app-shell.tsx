import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import mascot from "@/shared/ui/reqlogue-mascot-logo.webp";
import styles from "./app-shell.module.css";

type AppShellProps = {
  readonly children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles["shell"]}>
      <AppHeader />
      <main className={styles["main"]}>{children}</main>
    </div>
  );
}

function AppHeader() {
  return (
    <header className={styles["banner"]}>
      <Link href="/" aria-label="reqlogue ホーム" className={styles["home"]}>
        <Image
          src={mascot}
          alt=""
          width={56}
          height={56}
          priority
          className={styles["mark"]}
        />
      </Link>
    </header>
  );
}
