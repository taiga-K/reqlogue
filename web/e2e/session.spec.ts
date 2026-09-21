import { expect, test } from "@playwright/test";

test("はじめる carries the meeting name to the session header", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL(/\/session\?meetingName=/);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("the session header shows only the wordmark and meeting name", async ({
  page,
}) => {
  await page.goto(
    "/session?meetingName=%E6%96%B0%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%81%AE%E6%89%93%E3%81%A1%E5%90%88%E3%82%8F%E3%81%9B",
  );

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect(banner.getByRole("link")).toHaveCount(0);
  await expect(banner.getByRole("button")).toHaveCount(0);
  await expect(page.getByText("自動更新")).toHaveCount(0);
  await expect(page.getByText("会議を終了")).toHaveCount(0);
  await expect(page.getByText("マインドマップ")).toHaveCount(0);
});

test("a session URL without a name stays on /session", async ({ page }) => {
  await page.goto("/session");

  await expect(page).toHaveURL(/\/session\/?$/);
  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(page.getByRole("heading")).toHaveCount(0);
});
