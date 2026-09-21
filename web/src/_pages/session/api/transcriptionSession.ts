export function parseClientSecret(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if ("value" in value && typeof value.value === "string" && value.value.length > 0) {
    return value.value;
  }
  if (
    "client_secret" in value &&
    typeof value.client_secret === "object" &&
    value.client_secret !== null &&
    "value" in value.client_secret &&
    typeof value.client_secret.value === "string" &&
    value.client_secret.value.length > 0
  ) {
    return value.client_secret.value;
  }
  return null;
}

export type TranscriptionSessionResult =
  | { readonly status: "ready"; readonly clientSecret: string }
  | {
      readonly status: "unavailable";
      readonly reason: "missing-key" | "upstream" | "invalid-response";
    };

const OPENAI_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";

export async function createTranscriptionSession(input: {
  apiKey: string | undefined;
  fetch: typeof fetch;
}): Promise<TranscriptionSessionResult> {
  const apiKey = input.apiKey?.trim() ?? "";
  if (apiKey.length === 0) {
    return { status: "unavailable", reason: "missing-key" };
  }

  let response: Response;
  try {
    response = await input.fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "transcription",
          audio: {
            input: {
              transcription: {
                model: "gpt-realtime-whisper",
                language: "ja",
                delay: "low",
              },
              turn_detection: { type: "server_vad" },
            },
          },
        },
      }),
    });
  } catch {
    return { status: "unavailable", reason: "upstream" };
  }

  if (!response.ok) {
    return { status: "unavailable", reason: "upstream" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: "unavailable", reason: "invalid-response" };
  }

  const clientSecret = parseClientSecret(payload);
  if (clientSecret === null) {
    return { status: "unavailable", reason: "invalid-response" };
  }
  return { status: "ready", clientSecret };
}
