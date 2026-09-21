export const API_PREFIX = "/v1" as const;

export type ServiceName = "api" | "web";

export type HealthStatus = "ok" | "degraded";

export type HealthResponse = {
  status: HealthStatus;
  service: ServiceName;
};

export type ReadyResponse = {
  status: "ready";
};

export type SessionId = string;

export type SessionStatus = "idle" | "live" | "ended";

export type TranscriptSegment = {
  id: string;
  speaker: string;
  text: string;
  startedAt: string;
};

export type MindmapNode = {
  id: string;
  label: string;
  children: MindmapNode[];
};

export type AdviceKind = "ambiguity" | "contradiction" | "gap";

export type AdviceItem = {
  id: string;
  kind: AdviceKind;
  message: string;
};

export type SessionWorkspace = {
  id: SessionId;
  title: string;
  status: SessionStatus;
  transcript: TranscriptSegment[];
  mindmap: MindmapNode;
  advice: AdviceItem[];
};

export type RealtimeSttSession = {
  sessionId: SessionId;
  model: "gpt-realtime-whisper";
  clientSecret: string;
  url: string;
};
