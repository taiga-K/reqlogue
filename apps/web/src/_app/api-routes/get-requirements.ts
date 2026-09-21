import "server-only";

import { getRequirementsMarkdown } from "@/entities/session/index.server";

export async function getRequirements(sessionId: string) {
  const markdown = await getRequirementsMarkdown(sessionId);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="reqlogue-${sessionId}.md"`,
    },
  });
}
