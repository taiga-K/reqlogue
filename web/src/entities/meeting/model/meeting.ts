import {
  parseAdviceCards,
  type AdviceCard,
} from "./adviceCard";

declare const meetingIdBrand: unique symbol;

export type MeetingId = string & { readonly [meetingIdBrand]: true };

export type MeetingRecord = {
  readonly id: MeetingId;
  readonly name: string;
  readonly overview: string;
  readonly transcript: string;
  readonly mindmapMarkdown: string;
  readonly sentTranscriptOffset: number;
  readonly adviceCards: readonly AdviceCard[];
  readonly adviceSentTranscriptOffset: number;
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
  overview = "",
): MeetingRecord {
  return {
    id,
    name,
    overview,
    transcript: "",
    mindmapMarkdown: "",
    sentTranscriptOffset: 0,
    adviceCards: [],
    adviceSentTranscriptOffset: 0,
  };
}

const TRANSCRIPT_LINE = /^(\d{4}-\d{2}-\d{2}T[0-9:.]+Z) (.*)$/;

export function transcriptUtterances(transcript: string): readonly string[] {
  if (transcript.length === 0) {
    return [];
  }
  const utterances: string[] = [];
  for (const line of transcript.split("\n")) {
    const matched = TRANSCRIPT_LINE.exec(line);
    const speech = (matched?.[2] ?? line).trim();
    if (speech.length > 0) {
      utterances.push(speech);
    }
  }
  return utterances;
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
  const overview =
    "overview" in value && typeof value.overview === "string"
      ? value.overview
      : "";
  const mindmapMarkdown =
    "mindmapMarkdown" in value && typeof value.mindmapMarkdown === "string"
      ? value.mindmapMarkdown
      : "";
  return {
    id,
    name: value.name,
    overview,
    transcript: value.transcript,
    mindmapMarkdown,
    sentTranscriptOffset: parseSentOffset(value),
    adviceCards: parseAdviceCards(value),
    adviceSentTranscriptOffset: parseAdviceOffset(value),
  };
}

function parseSentOffset(value: object): number {
  if (!("sentTranscriptOffset" in value)) {
    return 0;
  }
  return offsetNumber(value.sentTranscriptOffset);
}

function parseAdviceOffset(value: object): number {
  if (!("adviceSentTranscriptOffset" in value)) {
    return 0;
  }
  return offsetNumber(value.adviceSentTranscriptOffset);
}

function offsetNumber(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    return 0;
  }
  return raw;
}
