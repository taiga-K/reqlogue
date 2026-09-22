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
const ADVICE_EVENT = "reqlogue-advice-change";
const parsedMeetings = new Map<string, { raw: string; record: MeetingRecord }>();

export function meetingStorageKey(id: MeetingId): string {
  return `${MEETING_STORAGE_PREFIX}${id}`;
}

export function startNewMeeting(
  brief: { readonly name: string; readonly overview: string },
  createUuid: () => string = () => crypto.randomUUID(),
): MeetingRecord {
  const name = brief.name.trim();
  const overview = brief.overview.trim();
  if (name.length === 0) {
    throw new Error("meeting name is required");
  }
  const id = mintMeetingId(createUuid);
  clearAllMeetings();
  const record = createMeetingRecord(id, name, overview);
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
  persist(record, "transcript");
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
  persist(next, "advice");
  return next;
}

export function clearMeeting(id: MeetingId): void {
  parsedMeetings.delete(meetingStorageKey(id));
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.removeItem(meetingStorageKey(id));
  notify("transcript");
}

export function clearAllMeetings(): void {
  parsedMeetings.clear();
  if (!hasLocalStorage()) {
    return;
  }
  for (const key of meetingKeys()) {
    localStorage.removeItem(key);
  }
  notify("transcript");
}

export function subscribeMeetings(onStoreChange: () => void): () => void {
  return listen(onStoreChange, [CHANGE_EVENT, ADVICE_EVENT]);
}

export function subscribeMeetingTranscript(onStoreChange: () => void): () => void {
  return listen(onStoreChange, [CHANGE_EVENT]);
}

function persist(record: MeetingRecord, kind: "transcript" | "advice"): void {
  if (!hasLocalStorage()) {
    return;
  }
  localStorage.setItem(meetingStorageKey(record.id), JSON.stringify(record));
  notify(kind);
}

function listen(onStoreChange: () => void, names: readonly string[]): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => {
    onStoreChange();
  };
  window.addEventListener("storage", handler);
  for (const name of names) {
    window.addEventListener(name, handler);
  }
  return () => {
    window.removeEventListener("storage", handler);
    for (const name of names) {
      window.removeEventListener(name, handler);
    }
  };
}

function notify(kind: "transcript" | "advice"): void {
  if (typeof window === "undefined") {
    return;
  }
  const name = kind === "advice" ? ADVICE_EVENT : CHANGE_EVENT;
  window.dispatchEvent(new Event(name));
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
