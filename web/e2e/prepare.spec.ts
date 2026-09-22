import { expect, test, type Page } from "@playwright/test";

const UUID_SESSION =
  /\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("はじめる opens /prepare", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "はじめる" }).click();
  await expect(page).toHaveURL(/\/prepare\/?$/);
});

test("prep shows the wordmark, headline, fields, and a disabled 次へ", async ({
  page,
}) => {
  await page.goto("/prepare");

  await expect(page.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "会議の準備をしましょう" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "会議名" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "会議の概要" })).toBeVisible();
  await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled();
});

test("whitespace name or overview alone leaves 次へ disabled", async ({
  page,
}) => {
  await page.goto("/prepare");
  const next = page.getByRole("button", { name: "次へ" });

  await page.getByRole("textbox", { name: "会議名" }).fill("   ");
  await expect(next).toBeDisabled();
  await expect(page).toHaveURL(/\/prepare\/?$/);

  await page.getByRole("textbox", { name: "会議名" }).fill("");
  await page.getByRole("textbox", { name: "会議の概要" }).fill("話したいこと");
  await expect(next).toBeDisabled();
  await expect(page).toHaveURL(/\/prepare\/?$/);
});

test("a trimmed name enables 次へ and opens a named session", async ({
  page,
}) => {
  await page.goto("/prepare");
  await page.getByRole("textbox", { name: "会議名" }).fill(
    "  新サービスの打ち合わせ  ",
  );
  const next = page.getByRole("button", { name: "次へ" });
  await expect(next).toBeEnabled();
  await next.click();

  await expect(page).toHaveURL(UUID_SESSION);
  await expect(page).not.toHaveURL(/meetingName/);
  await expect(
    page.getByRole("banner").getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("overview text is stored on the meeting record", async ({ page }) => {
  await page.goto("/prepare");
  await page.getByRole("textbox", { name: "会議名" }).fill("新サービスの打ち合わせ");
  await page.getByRole("textbox", { name: "会議の概要" }).fill(
    "今回話したいこと",
  );
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page).toHaveURL(UUID_SESSION);

  await expect.poll(async () => readMeetingRecords(page)).toContain(
    "今回話したいこと",
  );
});

async function readMeetingRecords(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("reqlogue.meeting."))
      .map((key) => localStorage.getItem(key) ?? "")
      .join("\n"),
  );
}
