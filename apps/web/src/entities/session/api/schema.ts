import type { MindmapNode, SessionWorkspace } from "@reqlogue/contracts";
import { z } from "zod";

const mindmapNodeSchema: z.ZodType<MindmapNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    children: z.array(mindmapNodeSchema),
  }),
);

export const sessionWorkspaceSchema: z.ZodType<SessionWorkspace> = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["idle", "live", "ended"]),
  transcript: z.array(
    z.object({
      id: z.string(),
      speaker: z.string(),
      text: z.string(),
      startedAt: z.string(),
    }),
  ),
  mindmap: mindmapNodeSchema,
  advice: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["ambiguity", "contradiction", "gap"]),
      message: z.string(),
    }),
  ),
});
