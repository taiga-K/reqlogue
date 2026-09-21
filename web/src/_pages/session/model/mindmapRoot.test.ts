import { describe, expect, it } from "vitest";
import { pinMindmapRoot } from "./mindmapRoot";

describe("pinMindmapRoot", () => {
  it("replaces a model title with the meeting name and keeps the branches", () => {
    expect(
      pinMindmapRoot("# モデルの題\n\n- ログイン\n- パスワード", "test"),
    ).toBe("# test\n\n- ログイン\n- パスワード");
    expect(
      pinMindmapRoot(
        "# 別の題\n\n## 認証\n\n- ログイン",
        "〇〇の要件定義会議",
      ),
    ).toBe("# 〇〇の要件定義会議\n\n## 認証\n\n- ログイン");
  });

  it("changes only the root line when the meeting name changes", () => {
    const branches = "# test\n\n## 認証\n\n- ログイン";
    expect(pinMindmapRoot(branches, "〇〇の要件定義会議")).toBe(
      "# 〇〇の要件定義会議\n\n## 認証\n\n- ログイン",
    );
  });

  it("uses an empty root when the meeting name is blank", () => {
    expect(pinMindmapRoot("# 会議\n\n- 要件", "")).toBe("#\n\n- 要件");
    expect(pinMindmapRoot("# 無題\n\n- 要件", "   ")).toBe("#\n\n- 要件");
  });

  it("adds a root when the model omits a heading", () => {
    expect(pinMindmapRoot("- ログイン", "test")).toBe("# test\n\n- ログイン");
  });

  it("skips a hash line inside a fence and rewrites the real root", () => {
    const markdown = "```\n# command\n```\n\n# モデルの題\n\n- ログイン";
    expect(pinMindmapRoot(markdown, "test")).toBe(
      "```\n# command\n```\n\n# test\n\n- ログイン",
    );
  });

  it("closes a fence when the ending run is longer than the opening run", () => {
    const markdown = "```\n# command\n````\n\n# モデルの題\n\n- ログイン";
    expect(pinMindmapRoot(markdown, "test")).toBe(
      "```\n# command\n````\n\n# test\n\n- ログイン",
    );
  });

  it("keeps a fenced command when the root heading comes first", () => {
    const markdown = "# モデルの題\n\n```\n# command\n```\n\n- ログイン";
    expect(pinMindmapRoot(markdown, "test")).toBe(
      "# test\n\n```\n# command\n```\n\n- ログイン",
    );
  });

  it("leaves an empty document empty", () => {
    expect(pinMindmapRoot("", "test")).toBe("");
    expect(pinMindmapRoot("  \n", "test")).toBe("  \n");
  });
});
