declare const meetingIdBrand: unique symbol;

export type MeetingId = string & { readonly [meetingIdBrand]: true };

export type MeetingRecord = {
  readonly id: MeetingId;
  readonly name: string;
  readonly transcript: string;
};

export function parseMeetingId(raw: string): MeetingId | null {
  const id = raw.trim();
  if (id.length === 0) {
    return null;
  }
  return id as MeetingId;
}

export function mintMeetingId(
  createUuid: () => string = () => crypto.randomUUID(),
): MeetingId {
  const id = parseMeetingId(createUuid());
  if (id === null) {
    throw new Error("meeting id must be non-empty");
  }
  return id;
}

export function createMeetingRecord(
  id: MeetingId,
  name: string,
): MeetingRecord {
  return { id, name, transcript: "" };
}

export function appendTranscriptLine(
  transcript: string,
  at: Date,
  text: string,
): string {
  const lineText = text.trim();
  if (lineText.length === 0) {
    return transcript;
  }
  const line = `${at.toISOString()} ${lineText}`;
  if (transcript.length === 0) {
    return line;
  }
  return `${transcript}\n${line}`;
}

export function parseMeetingRecord(
  id: MeetingId,
  value: unknown,
): MeetingRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("id" in value) || typeof value.id !== "string" || value.id !== id) {
    return null;
  }
  if (!("name" in value) || typeof value.name !== "string") {
    return null;
  }
  if (!("transcript" in value) || typeof value.transcript !== "string") {
    return null;
  }
  return { id, name: value.name, transcript: value.transcript };
}
