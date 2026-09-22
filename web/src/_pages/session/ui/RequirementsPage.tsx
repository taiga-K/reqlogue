import { notFound } from "next/navigation";
import { parseMeetingId } from "@/entities/meeting";
import styles from "./RequirementsPage.module.css";
import { RequirementsView } from "./RequirementsView";

type RequirementsPageProps = {
  readonly params: Promise<{
    readonly meetingId: string;
  }>;
};

export async function RequirementsPage({ params }: RequirementsPageProps) {
  const { meetingId } = await params;
  const id = parseMeetingId(meetingId);
  if (id === null) {
    notFound();
  }

  return (
    // Theme copies data-astryx-theme onto <html>. This value ends that @scope
    // before the meeting header so theme.css cannot restyle the banner h1.
    <div className={styles["page"]} data-astryx-theme="reqlogue-page">
      <RequirementsView meetingId={id} />
    </div>
  );
}
