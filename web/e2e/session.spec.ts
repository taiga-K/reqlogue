import { expect, test, type Page } from "@playwright/test";

const UUID_SESSION = /\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("home start opens a named session banner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL(UUID_SESSION);
  await expect(page).not.toHaveURL(/meetingName/);

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("named session banner shows wordmark and name only", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page).toHaveURL(UUID_SESSION);

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect(banner.getByRole("button")).toHaveCount(0);
  await expect(banner.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("自動更新")).toHaveCount(0);
  await expect(page.getByText("マインドマップ")).toHaveCount(0);
});

test("empty name still mints a session id", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "はじめる" }).click();

  await expect(page).toHaveURL(UUID_SESSION);
  await expect(page).not.toHaveURL(/meetingName/);
  await expect(
    page.getByRole("banner").getByRole("img", { name: "reqlogue" }),
  ).toBeVisible();
  await expect(page.getByRole("heading")).toHaveCount(0);
});

test("start meeting writes local transcript and end clears it", async ({
  page,
}) => {
  await mockCaptureMedia(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill(
    "新サービスの打ち合わせ",
  );
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page).toHaveURL(UUID_SESSION);

  await page.getByRole("button", { name: "会議を開始" }).click();
  await expect(page.getByRole("button", { name: "会議を終了" })).toBeVisible();
  await expect(page.getByText("stub transcript")).toHaveCount(0);

  await expect
    .poll(async () => readMeetingRecords(page))
    .toContain("stub transcript");

  await page.getByRole("button", { name: "会議を終了" }).click();
  await expect(page.getByRole("button", { name: "会議を開始" })).toBeVisible();
  await expect.poll(async () => readMeetingKeys(page)).toEqual([]);
});

test("starting a new meeting clears the previous record", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill("旧会議");
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page).toHaveURL(UUID_SESSION);
  await expect.poll(async () => readMeetingKeys(page)).toHaveLength(1);
  const firstKeys = await readMeetingKeys(page);

  await page.goto("/");
  await page.getByRole("textbox", { name: "今日の会議のなまえ" }).fill("新会議");
  await page.getByRole("button", { name: "はじめる" }).click();
  await expect(page).toHaveURL(UUID_SESSION);
  await expect(page.getByRole("heading", { name: "新会議" })).toBeVisible();
  const secondKeys = await readMeetingKeys(page);
  expect(secondKeys).toHaveLength(1);
  expect(secondKeys[0]).not.toBe(firstKeys[0]);
});

async function mockCaptureMedia(page: Page) {
  await page.addInitScript(() => {
    const fakeStream = () => {
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      const oscillator = context.createOscillator();
      oscillator.connect(destination);
      oscillator.start();
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      return Promise.resolve(
        new MediaStream([
          ...destination.stream.getAudioTracks(),
          ...canvas.captureStream().getVideoTracks(),
        ]),
      );
    };
    navigator.mediaDevices.getDisplayMedia = fakeStream;
    navigator.mediaDevices.getUserMedia = fakeStream;
  });
}

async function readMeetingKeys(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith("reqlogue.meeting.")),
  );
}

async function readMeetingRecords(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("reqlogue.meeting."))
      .map((key) => localStorage.getItem(key) ?? "")
      .join("\n"),
  );
}
