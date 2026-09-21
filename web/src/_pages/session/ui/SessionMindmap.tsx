"use client";

import { useEffect, useRef } from "react";
import styles from "./SessionMindmap.module.css";

type SessionMindmapProps = {
  readonly markdown: string;
};

export function SessionMindmap({ markdown }: SessionMindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = markdown.trim();

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null || frame.length === 0) {
      return;
    }
    let cancelled = false;
    let destroy: (() => void) | undefined;
    void Promise.all([import("markmap-lib"), import("markmap-view")]).then(
      ([{ Transformer }, { Markmap }]) => {
        if (cancelled || svgRef.current === null) {
          return;
        }
        const { root } = new Transformer().transform(frame);
        const markmap = Markmap.create(svg, undefined, root);
        void markmap.fit();
        destroy = () => {
          markmap.destroy();
        };
      },
    );
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [frame]);

  if (frame.length === 0) {
    return null;
  }

  return (
    <div className={styles["frame"]}>
      <svg ref={svgRef} className={styles["svg"]} role="img" />
    </div>
  );
}
