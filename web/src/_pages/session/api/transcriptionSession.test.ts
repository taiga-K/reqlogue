import { describe, expect, it, vi } from "vitest";
import {
  createTranscriptionSession,
  parseClientSecret,
} from "./transcriptionSession";

describe("parseClientSecret", () => {
  it("reads GA value and nested client_secret.value", () => {
    expect(parseClientSecret({ value: "ek_live" })).toBe("ek_live");
    expect(parseClientSecret({ client_secret: { value: "ek_nested" } })).toBe(
      "ek_nested",
    );
    expect(parseClientSecret({ value: "" })).toBeNull();
    expect(parseClientSecret(null)).toBeNull();
  });
});

describe("createTranscriptionSession", () => {
  it("does not call OpenAI when the key is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(
      createTranscriptionSession({ apiKey: "  ", fetch: fetchMock }),
    ).resolves.toEqual({ status: "unavailable", reason: "missing-key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only the client secret from an upstream session", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          value: "ek_ok",
          session: { type: "transcription" },
        }),
      ),
    );
    await expect(
      createTranscriptionSession({ apiKey: "sk-test", fetch: fetchMock }),
    ).resolves.toEqual({ status: "ready", clientSecret: "ek_ok" });
  });

  it("maps a failed upstream response", async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response("nope", { status: 401 })),
    );
    await expect(
      createTranscriptionSession({ apiKey: "sk-test", fetch: fetchMock }),
    ).resolves.toEqual({ status: "unavailable", reason: "upstream" });
  });
});
