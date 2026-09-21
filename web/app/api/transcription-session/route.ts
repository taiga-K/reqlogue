import "server-only";
import { createTranscriptionSession } from "@/_pages/session/api/transcriptionSession";

export async function POST() {
  const result = await createTranscriptionSession({
    apiKey: process.env["OPENAI_API_KEY"],
    fetch: globalThis.fetch,
  });

  switch (result.status) {
    case "ready":
      return Response.json(
        { clientSecret: result.clientSecret },
        { headers: { "Cache-Control": "no-store" } },
      );
    case "unavailable": {
      const status = result.reason === "missing-key" ? 503 : 502;
      return Response.json(
        { status: "unavailable", reason: result.reason },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}
