import { expect, test } from "@playwright/test";

test("home explains the product and opens the meeting workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "reqlogue" })).toBeVisible();
  await expect(page.getByRole("main")).toMatchAriaSnapshot(`
    - main:
      - heading "reqlogue"
      - list
      - link "デモ会議を開く"
  `);
  await page.getByRole("link", { name: "デモ会議を開く" }).click();
  await expect(page.getByRole("heading", { name: "受発注システムの要件定義" })).toBeVisible();
  await expect(page.getByRole("list", { name: "会議の文字起こし" })).toBeVisible();
  await expect(page.getByRole("list", { name: "会議のマインドマップ" })).toBeVisible();
  await expect(page.getByRole("list", { name: "曖昧・矛盾・漏れの助言" })).toBeVisible();
  await expect(page.getByRole("button", { name: "要件定義書を書き出す" })).toBeVisible();
});
