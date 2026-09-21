export const SESSION_NAME_PARAM = "meetingName";

export type SessionMeeting =
  | { readonly status: "blank" }
  | { readonly status: "named"; readonly name: string };

export function sessionMeetingFromParam(
  param: string | string[] | undefined,
): SessionMeeting {
  const raw = typeof param === "string" ? param : "";
  const name = raw.trim();
  if (name.length === 0) {
    return { status: "blank" };
  }
  return { status: "named", name };
}
