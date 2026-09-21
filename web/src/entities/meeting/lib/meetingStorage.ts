import {
  appendTranscriptLine,
  createMeetingRecord,
  mintMeetingId,
  parseMeetingRecord,
  type MeetingId,
  type MeetingRecord,
} from "../model/meeting";

export const MEETING_STORAGE_PREFIX = "reqlogue.meeting.";
const CHANGE_EVENT = "reqlogue-meeting-change";

export function meetingStorageKey(id: MeetingId): string {
  return `${MEETING_STORAGE_PREFIX}${id}`;
}

export function startNewMeeting(
  name: string,
  createUuid: () => string = () => crypto.randomUUID(),
): MeetingRecord {
  const id = mintMeetingId(createUuid);
  clearAllMeetings();
  const record = createMeetingRecord(id, name);
  writeMeeting(record);
  return record;
}

export function readMeeting(id: MeetingId): MeetingRecord | null {
  if (!hasLocalStorage()) {
    return null;
  }
  const raw = localStorage.getItem(meetingStorageKey(id));
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return parseMeetingRecord(id, parsed);
}

export function writeMeeting(record: MeetingRecord): void {
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.setItem(meetingStorageKey(record.id), JSON.stringify(record));
  notify();
}

export function ensureMeeting(id: MeetingId): MeetingRecord {
  const existing = readMeeting(id);
  if (existing !== null) {
    return existing;
  }
  const created = createMeetingRecord(id, "");
  writeMeeting(created);
  return created;
}

export function appendMeetingTranscript(
  id: MeetingId,
  at: Date,
  text: string,
): MeetingRecord {
  const existing = readMeeting(id) ?? createMeetingRecord(id, "");
  const next: MeetingRecord = {
    id: existing.id,
    name: existing.name,
    transcript: appendTranscriptLine(existing.transcript, at, text),
    mindmapMarkdown: existing.mindmapMarkdown,
    sentTranscriptOffset: existing.sentTranscriptOffset,
  };
  writeMeeting(next);
  return next;
}

export function saveMindmapProgress(
  id: MeetingId,
  markdown: string,
  sentTranscriptOffset: number,
): MeetingRecord | null {
  const existing = readMeeting(id);
  if (existing === null) {
    return null;
  }
  const next: MeetingRecord = {
    id: existing.id,
    name: existing.name,
    transcript: existing.transcript,
    mindmapMarkdown: markdown,
    sentTranscriptOffset,
  };
  writeMeeting(next);
  return next;
}

export function clearMeeting(id: MeetingId): void {
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.removeItem(meetingStorageKey(id));
  notify();
}

export function clearAllMeetings(): void {
  if (!hasLocalStorage()) {
    return;
  }
  for (const key of meetingKeys()) {
    localStorage.removeItem(key);
  }
  notify();
}

export function subscribeMeetings(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => {
    onStoreChange();
  };
  window.addEventListener("storage", handler);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(CHANGE_EVENT, handler);
  };
}

function notify(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function meetingKeys(): string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null && key.startsWith(MEETING_STORAGE_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}
