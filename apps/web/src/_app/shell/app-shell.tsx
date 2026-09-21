import type { ReactNode } from "react";
import { cssClass } from "@/shared/lib";
import { AppHeader } from "@/shared/ui";
import styles from "./app-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={cssClass(styles, "shell")}>
      <AppHeader />
      <div className={cssClass(styles, "content")}>{children}</div>
    </div>
  );
}
