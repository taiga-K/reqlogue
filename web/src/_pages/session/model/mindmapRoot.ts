const ROOT_HEADING = /^#(?:[ \t]|$)/;
const FENCE = /^(```+|~~~+)(.*)$/;

export function pinMindmapRoot(markdown: string, meetingName: string): string {
  if (markdown.trim().length === 0) {
    return markdown;
  }
  const heading = rootHeading(meetingName);
  const lines = markdown.split("\n");
  const index = firstRootHeading(lines);
  if (index === -1) {
    return `${heading}\n\n${markdown}`;
  }
  const next = lines.slice();
  next[index] = heading;
  return next.join("\n");
}

function firstRootHeading(lines: readonly string[]): number {
  let fence: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const marker = FENCE.exec(line.trim());
    if (fence === null) {
      if (marker !== null) {
        fence = marker[1] ?? null;
        continue;
      }
      if (ROOT_HEADING.test(line)) {
        return index;
      }
      continue;
    }
    const close = marker?.[1];
    if (
      marker !== null &&
      close !== undefined &&
      close.startsWith(fence) &&
      (marker[2] ?? "") === ""
    ) {
      fence = null;
    }
  }
  return -1;
}

function rootHeading(meetingName: string): string {
  if (meetingName.trim().length === 0) {
    return "#";
  }
  const label = meetingName.replace(/\r\n|\r|\n/g, " ");
  return `# ${label}`;
}
