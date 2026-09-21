import { describe, expect, it } from "vitest";
import {
  isFillerOnly,
  speechFromTranscript,
  takeSendablePrefix,
  unsentSlice,
} from "./mindmapUpdate";

describe("speechFromTranscript", () => {
  it("drops timestamps and keeps speech order", () => {
    expect(
      speechFromTranscript(
        "2026-09-21T16:00:00.000Z ログインはメール\n2026-09-21T16:00:02.000Z パスワードも",
      ),
    ).toBe("ログインはメール\nパスワードも");
  });
});

describe("isFillerOnly", () => {
  it("skips only うん はい ええ and keeps any other short utterance", () => {
    expect(isFillerOnly("うん")).toBe(true);
    expect(isFillerOnly("はい ええ")).toBe(true);
    expect(isFillerOnly("うん。")).toBe(false);
    expect(isFillerOnly("はい、それで")).toBe(false);
    expect(isFillerOnly("了解")).toBe(false);
  });
});

describe("takeSendablePrefix", () => {
  const short =
    "2026-09-21T16:00:00.000Z ログインはメールでやりたい";
  const longSpeech = "あ".repeat(200);
  const longLine = `2026-09-21T16:00:00.000Z ${longSpeech}`;
  const nextLine = "2026-09-21T16:00:20.000Z 次の話題";

  it("sends the full unsent text after quiet when it is under 200 letters", () => {
    expect(takeSendablePrefix(short, "quiet")).toBe(short);
  });

  it("waits for a later segment when one line is already 200 letters", () => {
    expect(takeSendablePrefix(longLine, "crossed")).toBeNull();
    expect(takeSendablePrefix(longLine, "quiet")).toBeNull();
    expect(takeSendablePrefix(longLine, "force")).toBe(longLine);
  });

  it("cuts at the next segment once unsent crosses 200 letters", () => {
    const unsent = `${longLine}\n${nextLine}`;
    expect(takeSendablePrefix(unsent, "crossed")).toBe(longLine);
    expect(unsentSlice(unsent, longLine.length)).toBe(nextLine);
  });
});
