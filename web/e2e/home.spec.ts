import { expect, test } from "@playwright/test";
import { homeCopy } from "../src/_pages/home/ui/home-copy";

test("home stays on / after the meeting name is submitted", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: homeCopy.title }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: homeCopy.brandAlt })).toBeVisible();
  await expect(page.getByText("会議のまとめ")).toHaveCount(0);

  const input = page.getByLabel(homeCopy.meetingNameLabel);
  await input.fill("キックオフ");
  await input.press("Enter");

  await expect(page).toHaveURL("/");
  await expect(input).toHaveValue("キックオフ");
});
