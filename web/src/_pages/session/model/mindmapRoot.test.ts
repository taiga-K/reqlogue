import { Transformer } from "markmap-lib";
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
    expect(pinMindmapRoot("# 会議\n\n- 要件", "")).toBe("# \u200b\n\n- 要件");
    expect(pinMindmapRoot("# 無題\n\n- 要件", "   ")).toBe("# \u200b\n\n- 要件");
  });

  it("keeps a blank root when the map has one branch", () => {
    const { root } = new Transformer().transform(
      pinMindmapRoot("# 会議\n\n- 要件", ""),
    );
    expect(root.children).toHaveLength(1);
    expect(root.content).toBe("&#x200b;");
    expect(root.children[0]?.content).toBe("&#x8981;&#x4ef6;");
  });

  it("keeps the meeting name as the visible root when the model adds another h1", () => {
    const markdown =
      "# モデルの題\n\n## 認証\n\n- ログイン\n\n# 別話題\n\n## 詳細";
    const pinned = pinMindmapRoot(markdown, "test");
    expect(pinned).toBe(
      "# test\n\n## 認証\n\n- ログイン\n\n## 別話題\n\n### 詳細",
    );
    const { root } = new Transformer().transform(pinned);
    expect(root.content).toBe("test");
    expect(root.children).toHaveLength(2);
    expect(root.children[1]?.children).toHaveLength(1);
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
