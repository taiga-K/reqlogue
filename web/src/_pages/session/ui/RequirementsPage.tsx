import { notFound } from "next/navigation";
import { parseMeetingId } from "@/entities/meeting";
import pageStyles from "./SessionPage.module.css";
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
    <div className={pageStyles["page"]}>
      <RequirementsView meetingId={id} />
    </div>
  );
}
