import { describe, expect, it } from "vitest";
import { markdownBlocks } from "./requirementsMarkdown";

describe("markdownBlocks", () => {
  it("keeps the requirements title and numbered sections", () => {
    expect(
      markdownBlocks(
        "# 要件定義書\n\n## 1. プロジェクト/会議概要・背景・ゴール\n\nログインはメール。\n",
      ),
    ).toEqual([
      { kind: "h1", text: "要件定義書" },
      { kind: "h2", text: "1. プロジェクト/会議概要・背景・ゴール" },
      { kind: "p", text: "ログインはメール。" },
    ]);
  });
});
