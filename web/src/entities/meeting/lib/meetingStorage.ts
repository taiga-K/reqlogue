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
const parsedMeetings = new Map<string, { raw: string; record: MeetingRecord }>();

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
  const key = meetingStorageKey(id);
  const raw = localStorage.getItem(key);
  if (raw === null) {
    parsedMeetings.delete(key);
    return null;
  }
  const cached = parsedMeetings.get(key);
  if (cached !== undefined && cached.raw === raw) {
    return cached.record;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsedMeetings.delete(key);
    return null;
  }
  const record = parseMeetingRecord(id, parsed);
  if (record === null) {
    parsedMeetings.delete(key);
    return null;
  }
  parsedMeetings.set(key, { raw, record });
  return record;
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
    ...existing,
    transcript: appendTranscriptLine(existing.transcript, at, text),
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
    ...existing,
    mindmapMarkdown: markdown,
    sentTranscriptOffset,
  };
  writeMeeting(next);
  return next;
}

export function saveAdviceProgress(
  id: MeetingId,
  adviceCards: MeetingRecord["adviceCards"],
  adviceSentTranscriptOffset: number,
): MeetingRecord | null {
  const existing = readMeeting(id);
  if (existing === null) {
    return null;
  }
  const next: MeetingRecord = {
    ...existing,
    adviceCards,
    adviceSentTranscriptOffset,
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
