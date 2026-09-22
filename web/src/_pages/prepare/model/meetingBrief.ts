export type MeetingBrief =
  | {
      readonly status: "unnamed";
      readonly nameRaw: string;
      readonly overviewRaw: string;
    }
  | {
      readonly status: "ready";
      readonly nameRaw: string;
      readonly overviewRaw: string;
      readonly name: string;
      readonly overview: string;
    };

export function briefOf(nameRaw: string, overviewRaw: string): MeetingBrief {
  const name = nameRaw.trim();
  const overview = overviewRaw.trim();
  if (name.length === 0) {
    return { status: "unnamed", nameRaw, overviewRaw };
  }
  return { status: "ready", nameRaw, overviewRaw, name, overview };
}
