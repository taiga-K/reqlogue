import type { ReactNode } from "react";
import { cssClass } from "@/shared/lib";
import styles from "./panel.module.css";

type PanelProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Panel({ title, children, actions }: PanelProps) {
  const headingId = `${title}-heading`;

  return (
    <section className={cssClass(styles, "panel")} aria-labelledby={headingId}>
      <header className={cssClass(styles, "header")}>
        <h2 id={headingId} className={cssClass(styles, "title")}>
          {title}
        </h2>
        {actions}
      </header>
      <div className={cssClass(styles, "body")}>{children}</div>
    </section>
  );
}
