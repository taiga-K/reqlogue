import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RequirementsArticle } from "./RequirementsArticle";

const SAMPLE = `# 要件定義書

## 1. 概要

ログインはメール。

### 小見出し

#### 詳細

##### さらに

###### 最深

1. 最初
2. 次

- 箇条書き

\`inline\` と **強調** と *斜体*

[仕様](https://example.com/spec)

[危険](javascript:alert(1))

\`\`\`
const n = 1
\`\`\`

<script>alert(1)</script>
`;

describe("RequirementsArticle", () => {
  it("renders extended markdown and drops raw html", () => {
    const { container } = render(<RequirementsArticle markdown={SAMPLE} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "要件定義書" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "1. 概要" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "小見出し" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "詳細" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 5, name: "さらに" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 6, name: "最深" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ログインはメール。")).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["最初", "次", "箇条書き"]);
    expect(screen.getByText("強調").tagName).toBe("STRONG");
    expect(screen.getByText("斜体").tagName).toBe("EM");
    expect(screen.getByText("inline").tagName).toBe("CODE");
    expect(screen.getByText(/const n = 1/).tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "仕様" })).toHaveAttribute(
      "href",
      "https://example.com/spec",
    );
    expect(
      [...container.querySelectorAll("a")].map((anchor) =>
        anchor.getAttribute("href"),
      ),
    ).toEqual(["https://example.com/spec", ""]);
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("<script");
  });
});
