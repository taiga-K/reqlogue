export const QUIET_MS = 1500;
export const CHAR_CUT = 200;
export const BOUNDARY_WAIT_MS = 20_000;

const TIMESTAMP_PREFIX =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) (.*)$/;
const FILLERS = new Set(["うん", "はい", "ええ"]);

export function speechFromTranscript(slice: string): string {
  if (slice.length === 0) {
    return "";
  }
  return slice
    .split("\n")
    .map((line) => {
      const match = TIMESTAMP_PREFIX.exec(line);
      return match?.[2] ?? line;
    })
    .join("\n");
}

export function speechLength(speech: string): number {
  return Array.from(speech).length;
}

export function isFillerOnly(speech: string): boolean {
  const tokens = speech.split(/\s+/u).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => FILLERS.has(token));
}

export function unsentSlice(transcript: string, offset: number): string {
  let start = offset;
  if (start < 0) {
    start = 0;
  }
  if (start < transcript.length && transcript[start] === "\n") {
    start += 1;
  }
  if (start >= transcript.length) {
    return "";
  }
  return transcript.slice(start);
}

export function offsetAfterPrefix(
  transcript: string,
  from: number,
  prefix: string,
): number {
  let next = from + prefix.length;
  if (next < transcript.length && transcript[next] === "\n") {
    next += 1;
  }
  return next;
}

export type SendMode = "quiet" | "crossed" | "force";

export function takeSendablePrefix(unsent: string, mode: SendMode): string | null {
  const speech = speechFromTranscript(unsent);
  if (speech.length === 0 || isFillerOnly(speech)) {
    return null;
  }
  const length = speechLength(speech);
  if (mode === "force") {
    return unsent;
  }
  if (mode === "quiet" && length < CHAR_CUT) {
    return unsent;
  }
  const segments = unsent.split("\n");
  if (segments.length === 1 && length >= CHAR_CUT) {
    return null;
  }
  let acc = "";
  for (const segment of segments) {
    const next = acc.length === 0 ? segment : `${acc}\n${segment}`;
    if (speechLength(speechFromTranscript(next)) >= CHAR_CUT) {
      return next;
    }
    acc = next;
  }
  if (mode === "quiet") {
    return unsent;
  }
  return null;
}
