declare const meetingNameBrand: unique symbol;

export type MeetingName = string & { readonly [meetingNameBrand]: true };

export type MeetingNameDraft =
  | { readonly raw: string; readonly status: "blank" }
  | { readonly raw: string; readonly status: "ready"; readonly name: MeetingName };

export function draftOf(raw: string): MeetingNameDraft {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { raw, status: "blank" };
  }
  return { raw, status: "ready", name: trimmed as MeetingName };
}
