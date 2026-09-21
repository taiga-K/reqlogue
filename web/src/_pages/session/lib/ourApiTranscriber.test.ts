import { describe, expect, it } from "vitest";
import {
  apiBaseUrl,
  createStubTranscriber,
  parseTranscriptResponse,
  STUB_TRANSCRIPT,
} from "./ourApiTranscriber";

describe("parseTranscriptResponse", () => {
  it("reads trimmed text and rejects empty or speaker payloads", () => {
    expect(parseTranscriptResponse({ text: "  こんにちは  " })).toBe(
      "こんにちは",
    );
    expect(parseTranscriptResponse({ text: "   " })).toBeNull();
    expect(parseTranscriptResponse({ speaker: "進行", text: "はい" })).toBe(
      "はい",
    );
    expect(parseTranscriptResponse(null)).toBeNull();
  });
});

describe("createStubTranscriber", () => {
  it("emits the stub line without calling a network", async () => {
    const lines: string[] = [];
    const handle = await createStubTranscriber().start(
      {} as MediaStream,
      (text) => {
        lines.push(text);
      },
    );
    expect(lines).toEqual([STUB_TRANSCRIPT]);
    await handle.stop();
  });
});

describe("apiBaseUrl", () => {
  it("defaults to the local FastAPI origin", () => {
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
  });
});
