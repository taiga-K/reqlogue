import { expect, test } from "@playwright/test";

test("home shows the reqlogue banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
});

test("home body exposes the meeting name draft", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "話すことに、集中しよう。" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "今日の会議のなまえ" })).toBeVisible();

  const start = page.getByRole("button", { name: "はじめる" });
  await expect(start).toBeDisabled();

  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await expect(start).toBeEnabled();

  await expect(page.getByRole("button", { name: "おためし" })).toBeVisible();
  await expect(page.getByRole("img", { name: "reqlogue" })).toHaveCount(1);
});
