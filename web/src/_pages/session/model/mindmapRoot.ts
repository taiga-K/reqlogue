const ROOT_HEADING = /^#(?:[ \t]|$)/;

export function pinMindmapRoot(markdown: string, meetingName: string): string {
  if (markdown.trim().length === 0) {
    return markdown;
  }
  const heading = rootHeading(meetingName);
  const lines = markdown.split("\n");
  const index = lines.findIndex((line) => ROOT_HEADING.test(line));
  if (index === -1) {
    return `${heading}\n\n${markdown}`;
  }
  const next = lines.slice();
  next[index] = heading;
  return next.join("\n");
}

function rootHeading(meetingName: string): string {
  if (meetingName.trim().length === 0) {
    return "#";
  }
  const label = meetingName.replace(/\r\n|\r|\n/g, " ");
  return `# ${label}`;
}
