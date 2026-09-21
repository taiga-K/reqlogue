import "server-only";

import type { HealthResponse, RealtimeSttSession, SessionWorkspace } from "@reqlogue/contracts";
import { ApiRequestError, apiGetJson, apiGetText, apiPostJson } from "@/shared/api";
import {
  createPlaceholderRequirementsMarkdown,
  createPlaceholderWorkspace,
} from "../model/placeholder";
import { sessionWorkspaceSchema } from "./schema";

export async function getSessionWorkspace(sessionId: string): Promise<SessionWorkspace> {
  try {
    const payload: unknown = await apiGetJson(`/v1/sessions/${sessionId}`);
    return sessionWorkspaceSchema.parse(payload);
  } catch (error) {
    if (error instanceof ApiRequestError || error instanceof TypeError) {
      return createPlaceholderWorkspace(sessionId);
    }
    throw error;
  }
}

export async function getRequirementsMarkdown(sessionId: string): Promise<string> {
  try {
    return await apiGetText(`/v1/sessions/${sessionId}/requirements.md`);
  } catch (error) {
    if (error instanceof ApiRequestError || error instanceof TypeError) {
      return createPlaceholderRequirementsMarkdown(sessionId);
    }
    throw error;
  }
}

export async function createRealtimeSttSession(
  sessionId: string,
): Promise<RealtimeSttSession> {
  return apiPostJson<RealtimeSttSession>("/v1/realtime/stt/sessions", { sessionId });
}

export async function getApiHealth(): Promise<HealthResponse> {
  return apiGetJson<HealthResponse>("/health");
}
