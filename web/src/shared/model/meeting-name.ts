declare const meetingNameBrand: unique symbol;

export type MeetingName = string & { readonly [meetingNameBrand]: true };

export type MeetingNameDraft =
  | { readonly raw: string; readonly status: "blank" }
  | { readonly raw: string; readonly status: "ready"; readonly name: MeetingName };

export type MeetingHref = `/meeting?${string}`;

export const MEETING_NAME_PARAM = "name";

export function draftOf(raw: string): MeetingNameDraft {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { raw, status: "blank" };
  }
  return { raw, status: "ready", name: trimmed as MeetingName };
}

export function draftFromParam(
  param: string | string[] | undefined,
): MeetingNameDraft {
  return draftOf(typeof param === "string" ? param : "");
}

export function meetingHref(name: MeetingName): MeetingHref {
  return `/meeting?${MEETING_NAME_PARAM}=${encodeURIComponent(name)}`;
}
