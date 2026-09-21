"use client";

import { Lightbulb, Network } from "lucide-react";
import styles from "./SessionRail.module.css";

export type SessionPane = "mindmap" | "advice";

type SessionRailProps = {
  readonly pane: SessionPane;
  readonly onSelect: (pane: SessionPane) => void;
};

const ITEMS = [
  { id: "mindmap", label: "マインドマップ" },
  { id: "advice", label: "アドバイス" },
] as const satisfies readonly { id: SessionPane; label: string }[];

export function SessionRail({ pane, onSelect }: SessionRailProps) {
  return (
    <nav className={styles["rail"]} aria-label="セッション">
      {ITEMS.map((item) => {
        const selected = pane === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={styles["item"]}
            aria-current={selected ? "page" : undefined}
            onClick={() => {
              onSelect(item.id);
            }}
          >
            <RailIcon pane={item.id} selected={selected} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function RailIcon({ pane, selected }: { pane: SessionPane; selected: boolean }) {
  const color = selected ? "#F26F67" : "#242322";
  const icon = {
    size: 32,
    strokeWidth: 1.9,
    color,
    "aria-hidden": true,
  } as const;
  switch (pane) {
    case "mindmap":
      return <Network {...icon} />;
    case "advice":
      return <Lightbulb {...icon} />;
    default: {
      const _exhaustive: never = pane;
      return _exhaustive;
    }
  }
}
