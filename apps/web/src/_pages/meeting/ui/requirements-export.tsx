"use client";

import { useState } from "react";
import { cssClass } from "@/shared/lib";
import styles from "./requirements-export.module.css";

type ExportState = "idle" | "loading" | "error";

type RequirementsExportProps = {
  sessionId: string;
};

export function RequirementsExport({ sessionId }: RequirementsExportProps) {
  const [state, setState] = useState<ExportState>("idle");

  async function onExport() {
    setState("loading");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/requirements`);
      if (!response.ok) {
        setState("error");
        return;
      }
      const markdown = await response.text();
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reqlogue-${sessionId}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <button
        className={cssClass(styles, "button")}
        type="button"
        onClick={() => {
          void onExport();
        }}
        disabled={state === "loading"}
      >
        要件定義書を書き出す
      </button>
      {state === "error" ? (
        <p className={cssClass(styles, "status")} role="alert">
          書き出しに失敗しました
        </p>
      ) : null}
    </div>
  );
}
