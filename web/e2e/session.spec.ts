import { expect, test, type Locator, type Page } from "@playwright/test";

const UUID_SESSION =
  /\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test("home start opens a named session banner", async ({ page }) => {
  await startNamedSession(page, "新サービスの打ち合わせ");

  await expect(page).not.toHaveURL(/meetingName/);

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
});

test("named session banner shows wordmark and name only", async ({ page }) => {
  await startNamedSession(page, "新サービスの打ち合わせ");

  const banner = page.getByRole("banner");
  await expect(banner.getByRole("img", { name: "reqlogue" })).toBeVisible();
  await expect(
    banner.getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect(banner.getByRole("button")).toHaveCount(0);
  await expect(banner.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("自動更新")).toHaveCount(0);
  await expect(banner.getByText("マインドマップ")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "マインドマップ" })).toBeVisible();
});

test("start meeting writes local transcript and end clears it", async ({
  page,
}) => {
  await mockCaptureMedia(page);
  await startNamedSession(page, "新サービスの打ち合わせ");

  await page.getByRole("button", { name: "会議を開始" }).click();
  await expect(page.getByRole("button", { name: "会議を終了" })).toBeVisible();
  await expect(page.getByText("stub transcript")).toHaveCount(0);

  await expect
    .poll(async () => readMeetingRecords(page))
    .toContain("stub transcript");

  await expect(page.getByRole("main").getByRole("img")).toBeVisible();
  await expect(page.getByRole("banner").getByText("マインドマップ")).toHaveCount(0);
  await expect(page.getByText("stub transcript")).toHaveCount(0);

  await page.getByRole("button", { name: "会議を終了" }).click();
  await expect(page).toHaveURL(/\/requirements$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "要件定義書" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "1. プロジェクト/会議概要・背景・ゴール",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("heading", { name: "新サービスの打ち合わせ" }),
  ).toBeVisible();
  await expect.poll(async () => readMeetingKeys(page)).toEqual([]);
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);
});

test("named meeting root stays the meeting name and sits near the canvas center", async ({
  page,
}) => {
  await mockCaptureMedia(page);
  await startNamedSession(page, "test");

  await page.getByRole("button", { name: "会議を開始" }).click();
  await expect
    .poll(async () => readMeetingRecords(page))
    .toContain("# test");

  const svg = page.getByRole("main").getByRole("img");
  const root = svg.getByText("test", { exact: true });
  await expect(root).toBeVisible();
  await expect.poll(async () => rootBand(svg, root)).toBe("centered");

  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) =>
      item.startsWith("reqlogue.meeting."),
    );
    if (key === undefined) {
      return;
    }
    const record = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      name: string;
    };
    record.name = "〇〇の要件定義会議";
    localStorage.setItem(key, JSON.stringify(record));
    window.dispatchEvent(new Event("reqlogue-meeting-change"));
  });

  await expect
    .poll(async () => readMeetingRecords(page))
    .toContain("# 〇〇の要件定義会議");
  await expect(svg.getByText("test", { exact: true })).toHaveCount(0);
  const renamed = svg.getByText("〇〇の要件定義会議", { exact: true });
  await expect(renamed).toBeVisible();
  await expect.poll(async () => rootBand(svg, renamed)).toBe("centered");
  expect(await readMeetingRecords(page)).toContain("- 要件");
});

test("starting a new meeting clears the previous record", async ({ page }) => {
  await startNamedSession(page, "旧会議");
  await expect.poll(async () => readMeetingKeys(page)).toHaveLength(1);
  const firstKeys = await readMeetingKeys(page);

  await startNamedSession(page, "新会議");
  await expect(page.getByRole("heading", { name: "新会議" })).toBeVisible();
  const secondKeys = await readMeetingKeys(page);
  expect(secondKeys).toHaveLength(1);
  expect(secondKeys[0]).not.toBe(firstKeys[0]);
});

test("session rail opens the advice board", async ({ page }) => {
  await mockCaptureMedia(page);
  await startNamedSession(page, "新サービスの打ち合わせ");

  const mindmap = page.getByRole("button", { name: "マインドマップ" });
  const advice = page.getByRole("button", { name: "アドバイス" });
  await expect(mindmap).toHaveAttribute("aria-pressed", "true");
  await expect(advice).toHaveAttribute("aria-pressed", "false");
  await expect(mindmap.locator("svg")).toHaveAttribute("width", "32");
  await expect(mindmap.locator("svg")).toHaveAttribute("height", "32");
  await expect(mindmap.locator("svg")).toHaveAttribute("stroke-width", "1.9");
  await expect(mindmap.locator("svg")).toHaveAttribute("stroke", "#F26F67");
  await expect(advice.locator("svg")).toHaveAttribute("stroke", "#242322");
  await expect(mindmap).toHaveCSS("background-color", "rgb(253, 232, 230)");

  await advice.click();
  await expect(advice).toHaveAttribute("aria-pressed", "true");
  await expect(mindmap).toHaveAttribute("aria-pressed", "false");
  await expect(advice.locator("svg")).toHaveAttribute("stroke", "#F26F67");
  await expect(mindmap.locator("svg")).toHaveAttribute("stroke", "#242322");
  await expect(advice).toHaveCSS("background-color", "rgb(253, 232, 230)");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "アドバイス",
    "対応中",
    "解決済み",
  ]);
  await expect(page.getByText("議事メモ")).toHaveCount(0);
  await expect(page.getByText("タスク")).toHaveCount(0);
  await expect(page.getByText("ファイル")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);

  await mindmap.click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);

  await page.getByRole("button", { name: "会議を開始" }).click();
  await advice.click();
  const adviceColumn = page.getByRole("region", { name: "アドバイス" });
  const card = adviceColumn.getByRole("button");
  await expect(
    adviceColumn.getByRole("heading", { level: 3, name: "確認したい点" }),
  ).toBeVisible();
  await expect(page.getByText("stub transcript")).toHaveCount(0);
  const doing = page.getByRole("region", { name: "対応中" });
  await card.dragTo(doing, { steps: 20 });
  await expect(
    doing.getByRole("heading", { level: 3, name: "確認したい点" }),
  ).toBeVisible();

  await mindmap.click();
  const svg = page.getByRole("main").getByRole("img");
  await expect(svg).toBeVisible();
  await page.getByRole("button", { name: "拡大" }).click();
  const pose = await svg.locator("g").first().getAttribute("transform");
  await advice.click();
  await expect(svg).toBeHidden();
  await mindmap.click();
  await expect(svg.locator("g").first()).toHaveAttribute("transform", pose ?? "");

  await page.getByRole("button", { name: "会議を終了" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "確認したい点" })).toHaveCount(0);
});

async function startNamedSession(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("link", { name: "はじめる" }).click();
  await page.getByRole("textbox", { name: "会議名" }).fill(name);
  await page.getByRole("button", { name: "次へ" }).click();
  await expect(page).toHaveURL(UUID_SESSION);
}

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

async function rootBand(svg: Locator, root: Locator) {
  const canvas = await svg.boundingBox();
  const title = await root.boundingBox();
  if (canvas === null || title === null || canvas.width === 0) {
    return "unmeasured";
  }
  const ratio = (title.x + title.width / 2 - canvas.x) / canvas.width;
  if (ratio > 0.4 && ratio < 0.7) {
    return "centered";
  }
  return ratio.toFixed(3);
}

async function readMeetingKeys(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((key) =>
      key.startsWith("reqlogue.meeting."),
    ),
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
