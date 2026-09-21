import type { SessionStatus } from "@reqlogue/contracts";
import { assertNever, cssClass, cssClasses } from "@/shared/lib";
import styles from "./status-badge.module.css";

type BadgeStatus = SessionStatus | "degraded";

type StatusBadgeProps = {
  status: BadgeStatus;
};

function statusLabel(status: BadgeStatus): string {
  switch (status) {
    case "idle":
      return "待機";
    case "live":
      return "会議中";
    case "ended":
      return "終了";
    case "degraded":
      return "縮退";
    default:
      return assertNever(status);
  }
}

function statusClass(status: BadgeStatus): string {
  switch (status) {
    case "idle":
      return cssClass(styles, "idle");
    case "live":
      return cssClass(styles, "live");
    case "ended":
      return cssClass(styles, "ended");
    case "degraded":
      return cssClass(styles, "degraded");
    default:
      return assertNever(status);
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cssClasses(styles, "badge") + ` ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}
