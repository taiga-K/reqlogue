import { expect, test } from "@playwright/test";

test("home start opens a named session banner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/session" &&
      url.searchParams.get("meetingName") === "新サービスの打ち合わせ"
    );
  });

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("named session banner shows wordmark and name only", async ({ page }) => {
  await page.goto(
    `/session?meetingName=${encodeURIComponent("新サービスの打ち合わせ")}`,
  );

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect(banner.getByRole("button")).toHaveCount(0);
  await expect(banner.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("自動更新")).toHaveCount(0);
  await expect(page.getByText("会議を終了")).toHaveCount(0);
  await expect(page.getByText("マインドマップ")).toHaveCount(0);
});

test("blank session stays on /session with the wordmark banner", async ({
  page,
}) => {
  await page.goto("/session");

  await expect(page).toHaveURL((url) => {
    return url.pathname === "/session" && url.search === "";
  });
  await expect(
    page.getByRole("banner").getByRole("img", { name: "reqlogue" }),
  ).toBeVisible();
  await expect(page.getByRole("heading")).toHaveCount(0);
});
