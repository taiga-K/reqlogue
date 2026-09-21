import "server-only";

import { DEMO_SESSION_ID } from "@/entities/session";
import { getSessionWorkspace } from "@/entities/session/index.server";

export async function getMeetingWorkspace(sessionId: string = DEMO_SESSION_ID) {
  return getSessionWorkspace(sessionId);
}
