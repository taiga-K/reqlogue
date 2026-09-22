import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseMeetingId, writeRequirements } from "@/entities/meeting";
import { RequirementsView } from "./RequirementsView";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

vi.mock("next/image", () => ({
  default: function MockImage({
    alt,
    className,
  }: {
    readonly alt: string;
    readonly className?: string;
  }) {
    return createElement("img", {
      alt,
      className,
      src: "/wordmark.webp",
    });
  },
}));

function documentMeetingId() {
  const id = parseMeetingId("req-doc");
  if (id === null) {
    throw new Error("meeting id");
  }
  return id;
}

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

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderDocument(markdown: string) {
  const meetingId = documentMeetingId();
  writeRequirements({
    meetingId,
    name: "打ち合わせ",
    markdown,
  });
  return render(<RequirementsView meetingId={meetingId} />);
}

describe("RequirementsView", () => {
  it("renders headings h1 through h6 and matches each outline link to that heading id", () => {
    const { container } = renderDocument(SAMPLE);
    const main = screen.getByRole("main");
    const outline = screen.getByRole("navigation", { name: "見出し" });
    const headings = within(main).getAllByRole("heading");

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

    const links = within(outline).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      headings.map((heading) => `#${heading.id}`),
    );
    expect(new Set(headings.map((heading) => heading.id)).size).toBe(
      headings.length,
    );

    expect(screen.getByText("ログインはメール。")).toBeInTheDocument();
    expect(
      within(main)
        .getAllByRole("listitem")
        .filter((item) => !outline.contains(item))
        .map((item) => item.textContent),
    ).toEqual(["最初", "次", "箇条書き"]);
    expect(screen.getByText("強調").tagName).toBe("STRONG");
    expect(screen.getByText("斜体").tagName).toBe("EM");
    expect(screen.getByText("inline").tagName).toBe("CODE");
    const fenced = screen.getByText(/const n = 1/);
    expect(fenced.closest("pre")).not.toBeNull();
    expect(fenced.textContent).toContain("const n = 1");
    expect(screen.getByRole("link", { name: "仕様" })).toHaveAttribute(
      "href",
      "https://example.com/spec",
    );
    const hrefs = [...container.querySelectorAll("a")].map(
      (anchor) => anchor.getAttribute("href") ?? "",
    );
    expect(hrefs.some((href) => href.toLowerCase().startsWith("javascript:"))).toBe(
      false,
    );
    expect(screen.getByText("[危険](javascript:alert(1))").closest("a")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("<script");
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });

  it("gives two same-text headings different ids and a matching outline link each", () => {
    renderDocument(`# 要件定義書

## 同じ見出し

## 同じ見出し
`);
    const main = screen.getByRole("main");
    const outline = screen.getByRole("navigation", { name: "見出し" });
    const headings = within(main).getAllByRole("heading", {
      name: "同じ見出し",
    });
    const links = within(outline)
      .getAllByRole("link")
      .filter((link) => link.textContent === "同じ見出し");

    expect(headings).toHaveLength(2);
    expect(headings[0]?.id).not.toBe("");
    expect(headings[1]?.id).not.toBe("");
    expect(headings[0]?.id).not.toBe(headings[1]?.id);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `#${headings[0]?.id ?? ""}`,
      `#${headings[1]?.id ?? ""}`,
    ]);
  });

  it("keeps the missing-document sentence and hides the outline", () => {
    render(<RequirementsView meetingId={documentMeetingId()} />);

    expect(
      screen.getByText("この会議の要件定義書はまだありません。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "見出し" })).toBeNull();
  });
});
