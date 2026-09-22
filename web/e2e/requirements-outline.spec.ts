import { expect, test, type Page } from "@playwright/test";

const filler = Array.from(
  { length: 12 },
  (_, index) => `段落 ${String(index + 1)}。ログインはメール。`,
).join("\n\n");

const markdown = [
  "# 要件定義書",
  "",
  "## はじめに",
  "",
  filler,
  "",
  "## 中盤の要件",
  "",
  filler,
].join("\n");

test("requirements outline scrolls to the chosen heading", async ({ page }) => {
  await page.addInitScript((source) => {
    localStorage.setItem(
      "reqlogue.requirements.outline-e2e",
      JSON.stringify({
        meetingId: "outline-e2e",
        name: "新サービスの打ち合わせ",
        markdown: source,
      }),
    );
  }, markdown);

  await page.goto("/session/outline-e2e/requirements");

  const outline = page.getByRole("navigation", { name: "見出し" });
  await expect(outline.getByRole("link", { name: "はじめに" })).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "マインドマップ" })).toHaveCount(0);

  await outline.getByRole("link", { name: "中盤の要件" }).click();
  await expect(
    outline.getByRole("link", { name: "中盤の要件" }),
  ).toHaveAttribute("aria-current", "location");
  await expect.poll(() => headingOffset(page, "中盤の要件")).toBeLessThan(160);
  await expect.poll(() => paneScrollTop(page, "中盤の要件")).toBeGreaterThan(200);

  await page.evaluate(() => {
    const heading = [...document.querySelectorAll("h2")].find(
      (node) => node.textContent === "中盤の要件",
    );
    let pane = heading?.parentElement ?? null;
    while (pane && getComputedStyle(pane).overflowY !== "auto") {
      pane = pane.parentElement;
    }
    if (pane) pane.scrollTop = 0;
  });
  await expect(
    outline.getByRole("link", { name: "要件定義書" }),
  ).toHaveAttribute("aria-current", "location");
});

test("missing requirements document has no outline", async ({ page }) => {
  await page.goto("/session/missing-outline/requirements");
  await expect(
    page.getByText("この会議の要件定義書はまだありません。"),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "見出し" })).toHaveCount(0);
});

async function headingOffset(page: Page, name: string) {
  const place = await headingPlace(page, name);
  return place.offset;
}

async function paneScrollTop(page: Page, name: string) {
  const place = await headingPlace(page, name);
  return place.scrollTop;
}

async function headingPlace(page: Page, name: string) {
  return page.evaluate((headingName) => {
    const heading = [...document.querySelectorAll("h2")].find(
      (node) => node.textContent === headingName,
    );
    if (!heading) return { offset: 9999, scrollTop: 0 };
    let pane = heading.parentElement;
    while (pane && getComputedStyle(pane).overflowY !== "auto") {
      pane = pane.parentElement;
    }
    if (!pane) return { offset: 9999, scrollTop: 0 };
    return {
      offset: Math.round(
        heading.getBoundingClientRect().top - pane.getBoundingClientRect().top,
      ),
      scrollTop: pane.scrollTop,
    };
  }, name);
}
