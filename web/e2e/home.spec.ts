import { expect, test } from "@playwright/test";

test("home shows the reqlogue banner", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
});
