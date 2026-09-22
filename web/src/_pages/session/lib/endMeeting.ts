import {
  clearMeeting,
  readMeeting,
  transcriptUtterances,
  writeRequirements,
  type MeetingId,
} from "@/entities/meeting";
import { createRequirementsGenerator } from "./ourApiRequirements";

export type EndMeetingResult =
  | { readonly status: "ended" }
  | { readonly status: "failed" }
  | { readonly status: "nothing-to-end" };

export async function endMeeting(
  meetingId: MeetingId,
  finishTranscription: () => Promise<void> = async () => {},
): Promise<EndMeetingResult> {
  try {
    await finishTranscription();
    const record = readMeeting(meetingId);
    if (record === null) {
      return { status: "nothing-to-end" };
    }
    const markdown = await createRequirementsGenerator()({
      meetingId: record.id,
      meetingName: record.name,
      utterances: transcriptUtterances(record.transcript),
      detections: record.adviceCards.map((card) => ({
        title: card.title,
        reason: card.reason,
        suggestedQuestion: card.suggestedQuestion,
        quote: card.quote,
        column: card.column,
      })),
    });
    writeRequirements({
      meetingId: record.id,
      name: record.name,
      markdown,
    });
    clearMeeting(meetingId);
    return { status: "ended" };
  } catch {
    return { status: "failed" };
  }
}
