const ROOT_HEADING = /^#(?:[ \t]|$)/;
const ATX_HEADING = /^(#{1,6})(?:[ \t]|$)/;
const FENCE = /^(```+|~~~+)(.*)$/;

export function pinMindmapRoot(markdown: string, meetingName: string): string {
  if (markdown.trim().length === 0) {
    return markdown;
  }
  const heading = rootHeading(meetingName);
  const lines = markdown.split("\n");
  let fence: string | null = null;
  let rooted = false;
  let sink = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const marker = FENCE.exec(line.trim());
    if (fence === null) {
      if (marker !== null) {
        fence = marker[1] ?? null;
        continue;
      }
      if (ROOT_HEADING.test(line)) {
        if (!rooted) {
          lines[index] = heading;
          rooted = true;
          continue;
        }
        sink = true;
      }
      if (sink && ATX_HEADING.test(line)) {
        lines[index] = sinkHeading(line);
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
  if (!rooted) {
    return `${heading}\n\n${lines.join("\n")}`;
  }
  return lines.join("\n");
}

function sinkHeading(line: string): string {
  const marks = /^(#{1,6})/.exec(line)?.[1] ?? "";
  if (marks.length >= 6) {
    return line;
  }
  return `#${line}`;
}

function rootHeading(meetingName: string): string {
  if (meetingName.trim().length === 0) {
    // markmap drops an empty heading that has one child.
    return "# \u200b";
  }
  const label = meetingName.replace(/\r\n|\r|\n/g, " ");
  return `# ${label}`;
}
