import { expect, test } from "@playwright/test";

test("home shows the reqlogue banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
});

test("home shows the headline and start link without a name field", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "話すことに、集中しよう。" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "reqlogue" })).toHaveCount(1);

  const start = page.getByRole("link", { name: "はじめる" });
  await expect(start).toBeEnabled();
});
