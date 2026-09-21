import type { MindmapNode } from "@reqlogue/contracts";
import { cssClass } from "@/shared/lib";
import styles from "./live-mindmap.module.css";

type LiveMindmapProps = {
  root: MindmapNode;
};

function MindmapBranch({ node }: { node: MindmapNode }) {
  return (
    <li className={cssClass(styles, "leaf")}>
      {node.label}
      {node.children.length > 0 ? (
        <ul className={cssClass(styles, "tree")}>
          {node.children.map((child) => (
            <MindmapBranch key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function LiveMindmap({ root }: LiveMindmapProps) {
  if (root.children.length === 0 && root.label.length === 0) {
    return <p className={cssClass(styles, "empty")}>マインドマップはまだありません</p>;
  }

  return (
    <ul className={cssClass(styles, "tree")} aria-label="会議のマインドマップ">
      <MindmapBranch node={root} />
    </ul>
  );
}
