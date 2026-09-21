"use client";

import { useEffect, useRef, useState } from "react";
import { createSessionMarkmapHost, type SessionMarkmapHost } from "../lib/sessionMarkmapHost";
import { SCALE_MAX, SCALE_MIN } from "../model/mindmapCamera";
import { MindmapZoomToolbar } from "./MindmapZoomToolbar";
import styles from "./SessionMindmap.module.css";

type SessionMindmapProps = {
  readonly markdown: string;
};

export function SessionMindmap({ markdown }: SessionMindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hostRef = useRef<SessionMarkmapHost | null>(null);
  const [scale, setScale] = useState(1);
  const frame = markdown.trim();
  const hasDocument = frame.length > 0;

  useEffect(() => {
    if (!hasDocument) {
      return;
    }
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const host = createSessionMarkmapHost(svg);
    hostRef.current = host;
    const unsubscribe = host.subscribe(() => {
      setScale(host.readScale());
    });
    return () => {
      unsubscribe();
      host.dispose();
      hostRef.current = null;
    };
  }, [hasDocument]);

  useEffect(() => {
    if (!hasDocument) {
      return;
    }
    hostRef.current?.replaceDocument(frame);
  }, [frame, hasDocument]);

  if (!hasDocument) {
    return null;
  }

  return (
    <div className={styles["frame"]}>
      <svg ref={svgRef} className={styles["svg"]} role="img" />
      <MindmapZoomToolbar
        zoomInEnabled={scale < SCALE_MAX}
        zoomOutEnabled={scale > SCALE_MIN}
        fitEnabled
        onZoomIn={() => {
          hostRef.current?.command({ type: "zoom-in" });
        }}
        onZoomOut={() => {
          hostRef.current?.command({ type: "zoom-out" });
        }}
        onFit={() => {
          hostRef.current?.command({ type: "fit" });
        }}
      />
    </div>
  );
}
