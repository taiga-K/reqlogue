import type { Metadata } from "next";
import { cssClass } from "@/shared/lib";
import { Panel, StatusBadge } from "@/shared/ui";
import { getMeetingWorkspace } from "../api/get-meeting-workspace";
import { LiveMindmap } from "./live-mindmap";
import { LiveTranscript } from "./live-transcript";
import { MeetingAdvice } from "./meeting-advice";
import styles from "./meeting-page.module.css";
import { RequirementsExport } from "./requirements-export";

export const metadata: Metadata = {
  title: "会議ワークスペース",
};

export async function MeetingPage() {
  const workspace = await getMeetingWorkspace();

  return (
    <main className={cssClass(styles, "page")}>
      <div className={cssClass(styles, "headingRow")}>
        <h1 className={cssClass(styles, "title")}>{workspace.title}</h1>
        <StatusBadge status={workspace.status} />
      </div>
      <div className={cssClass(styles, "grid")}>
        <Panel title="リアルタイム文字起こし">
          <LiveTranscript segments={workspace.transcript} />
        </Panel>
        <Panel title="ライブマインドマップ">
          <LiveMindmap root={workspace.mindmap} />
        </Panel>
        <Panel
          title="確認した方が良いこと"
          actions={<RequirementsExport sessionId={workspace.id} />}
        >
          <MeetingAdvice items={workspace.advice} />
        </Panel>
      </div>
    </main>
  );
}
