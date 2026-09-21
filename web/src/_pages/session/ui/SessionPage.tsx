import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseMeetingId } from "@/entities/meeting";
import { SessionWorkspace } from "./SessionWorkspace";
import styles from "./SessionPage.module.css";

type SessionPageProps = {
  readonly params: Promise<{
    readonly meetingId: string;
  }>;
};

export function generateMetadata(): Metadata {
  return {};
}

export async function SessionPage({ params }: SessionPageProps) {
  const { meetingId } = await params;
  const id = parseMeetingId(meetingId);
  if (id === null) {
    notFound();
  }

  return (
    <div className={styles["page"]}>
      <SessionWorkspace meetingId={id} />
    </div>
  );
}
