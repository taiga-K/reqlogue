import type { AdviceItem, AdviceKind } from "@reqlogue/contracts";
import { formatAdviceKind } from "@/entities/session";
import { assertNever, cssClass } from "@/shared/lib";
import styles from "./meeting-advice.module.css";

type MeetingAdviceProps = {
  items: AdviceItem[];
};

function kindClass(kind: AdviceKind): string {
  switch (kind) {
    case "ambiguity":
      return cssClass(styles, "ambiguity");
    case "contradiction":
      return cssClass(styles, "contradiction");
    case "gap":
      return cssClass(styles, "gap");
    default:
      return assertNever(kind);
  }
}

export function MeetingAdvice({ items }: MeetingAdviceProps) {
  if (items.length === 0) {
    return <p className={cssClass(styles, "empty")}>確認事項はまだありません</p>;
  }

  return (
    <ul className={cssClass(styles, "list")} aria-label="曖昧・矛盾・漏れの助言">
      {items.map((item) => (
        <li key={item.id} className={cssClass(styles, "item")}>
          <span className={`${cssClass(styles, "kind")} ${kindClass(item.kind)}`}>
            {formatAdviceKind(item.kind)}
          </span>
          <p className={cssClass(styles, "message")}>{item.message}</p>
        </li>
      ))}
    </ul>
  );
}
