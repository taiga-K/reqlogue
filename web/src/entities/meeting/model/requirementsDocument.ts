import { parseMeetingId, type MeetingId } from "./meeting";

export type RequirementsDocument = {
  readonly meetingId: MeetingId;
  readonly name: string;
  readonly markdown: string;
};

export function parseRequirementsDocument(
  id: MeetingId,
  value: unknown,
): RequirementsDocument | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("meetingId" in value) || typeof value.meetingId !== "string") {
    return null;
  }
  const meetingId = parseMeetingId(value.meetingId);
  if (meetingId === null || meetingId !== id) {
    return null;
  }
  if (!("name" in value) || typeof value.name !== "string") {
    return null;
  }
  if (!("markdown" in value) || typeof value.markdown !== "string") {
    return null;
  }
  if (value.markdown.trim().length === 0) {
    return null;
  }
  return {
    meetingId,
    name: value.name,
    markdown: value.markdown,
  };
}
