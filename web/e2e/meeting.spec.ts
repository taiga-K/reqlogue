import { expect, test } from "@playwright/test";

test("はじめる carries the name to the meeting screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL(/\/meeting\?name=/);
  await expect(
    page.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("the meeting screen shows the shared header with the mascot on the right", async ({
  page,
}) => {
  await page.goto("/meeting?name=%E6%96%B0%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%81%AE%E6%89%93%E3%81%A1%E5%90%88%E3%82%8F%E3%81%9B");

  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();

  const home = banner.getByRole("link", { name: "reqlogue ホーム" });
  await expect(home).toBeVisible();

  const bannerBox = await banner.boundingBox();
  const homeBox = await home.boundingBox();
  expect(bannerBox).not.toBeNull();
  expect(homeBox).not.toBeNull();
  if (bannerBox === null || homeBox === null) {
    return;
  }
  expect(homeBox.x).toBeGreaterThan(bannerBox.x + bannerBox.width / 2);
});

test("a meeting URL without a name returns home", async ({ page }) => {
  await page.goto("/meeting");
  await expect(page).toHaveURL("/");
});
