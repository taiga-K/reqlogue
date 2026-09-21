const ROOT_HEADING = /^#(?:[ \t]|$)/;
const FENCE = /^(```+|~~~+)(.*)$/;

export function pinMindmapRoot(markdown: string, meetingName: string): string {
  if (markdown.trim().length === 0) {
    return markdown;
  }
  const heading = rootHeading(meetingName);
  const lines = markdown.split("\n");
  let fence: string | null = null;
  let rooted = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const marker = FENCE.exec(line.trim());
    if (fence === null) {
      if (marker !== null) {
        fence = marker[1] ?? null;
        continue;
      }
      if (!ROOT_HEADING.test(line)) {
        continue;
      }
      if (!rooted) {
        lines[index] = heading;
        rooted = true;
        continue;
      }
      lines[index] = demoteH1(line);
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

function demoteH1(line: string): string {
  if (line === "#") {
    return "##";
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
