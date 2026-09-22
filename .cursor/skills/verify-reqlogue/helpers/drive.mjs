import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const repoRoot = requiredEnv("REQLOGUE_VERIFY_REPO_ROOT");
const requireFromWeb = createRequire(path.join(repoRoot, "web", "package.json"));
const { chromium } = requireFromWeb("playwright");

const UUID_SESSION =
  /\/session\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MEETING_PREFIX = "reqlogue.meeting.";

const feature = process.argv[2];
const webUrl = requiredEnv("REQLOGUE_VERIFY_WEB_URL");
const apiUrl = process.env.REQLOGUE_VERIFY_API_URL ?? "";
const evidenceRoot = requiredEnv("REQLOGUE_VERIFY_EVIDENCE_DIR");
const withApi = process.env.REQLOGUE_VERIFY_WITH_API === "1";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

function fail(message) {
  throw new Error(message);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function meetingState(page) {
  return page.evaluate((prefix) => {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(prefix),
    );
    const records = keys.map((key) => ({
      key,
      value: localStorage.getItem(key),
    }));
    return { keys, records };
  }, MEETING_PREFIX);
}

function installFakeCapture(page) {
  return page.addInitScript(() => {
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

function installDeniedCapture(page) {
  return page.addInitScript(() => {
    const denied = () => Promise.reject(new Error("Permission denied"));
    navigator.mediaDevices.getDisplayMedia = denied;
    navigator.mediaDevices.getUserMedia = denied;
  });
}

async function capture(page, dir, stem) {
  const screenshot = path.join(dir, `${stem}.png`);
  const aria = path.join(dir, `${stem}.aria.txt`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const snapshot = await page.locator("body").ariaSnapshot();
  await writeFile(aria, `${snapshot}\n`, "utf8");
  return { screenshot, aria };
}

async function withBrowser(run) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    locale: "ja-JP",
  });
  try {
    return await run(page);
  } finally {
    await browser.close();
  }
}

async function waitForBannerHeading(page, name) {
  await page
    .getByRole("banner")
    .getByRole("heading", { name })
    .waitFor({ state: "visible" });
}

async function waitForSessionShell(page) {
  await page.getByRole("button", { name: "会議を開始" }).waitFor({ state: "visible" });
}

async function openPrepare(page) {
  await page.goto(`${webUrl}/`);
  await page.getByRole("link", { name: "はじめる" }).click();
  await page.waitForURL(/\/prepare\/?$/);
}

async function startNamedSession(page, name) {
  await openPrepare(page);
  await page.getByRole("textbox", { name: "会議名" }).fill(name);
  const next = page.getByRole("button", { name: "次へ" });
  if (!(await next.isEnabled())) {
    fail("次へ should enable once the meeting name is non-blank");
  }
  await next.click();
  await page.waitForURL(UUID_SESSION);
  await waitForBannerHeading(page, name);
  const url = page.url();
  const meetingId = url.split("/").pop() ?? "";
  return { url, meetingId };
}

async function driveHomeStart(dir) {
  return withBrowser(async (page) => {
    await page.goto(`${webUrl}/`);
    const before = await capture(page, dir, "00-home");
    if ((await page.getByRole("banner").count()) !== 1) {
      fail("home banner missing");
    }
    if ((await page.getByRole("img", { name: "reqlogue" }).count()) !== 1) {
      fail("home wordmark missing");
    }
    const heading = page.getByRole("heading", {
      name: "話すことに、集中しよう。",
    });
    if (!(await heading.isVisible())) {
      fail("home headline missing");
    }
    if ((await page.getByRole("textbox").count()) !== 0) {
      fail("home must not show a meeting name field");
    }
    const start = page.getByRole("link", { name: "はじめる" });
    if (!(await start.isEnabled())) {
      fail("はじめる should stay enabled on home");
    }

    await start.click();
    await page.waitForURL(/\/prepare\/?$/);
    const prepare = await capture(page, dir, "01-prepare");
    if (
      !(await page
        .getByRole("heading", { name: "会議の準備をしましょう" })
        .isVisible())
    ) {
      fail("prepare headline missing");
    }
    if (!(await page.getByRole("textbox", { name: "会議名" }).isVisible())) {
      fail("prepare name field missing");
    }
    if (!(await page.getByRole("textbox", { name: "会議の概要" }).isVisible())) {
      fail("prepare overview field missing");
    }
    const next = page.getByRole("button", { name: "次へ" });
    if (await next.isEnabled()) {
      fail("次へ must stay disabled until the name is non-blank");
    }

    await page.getByRole("textbox", { name: "会議名" }).fill(
      "新サービスの打ち合わせ",
    );
    if (!(await next.isEnabled())) {
      fail("次へ should enable once the meeting name is non-blank");
    }
    const filled = await capture(page, dir, "02-prepare-filled");
    await next.click();
    await page.waitForURL(UUID_SESSION);
    if (page.url().includes("meetingName")) {
      fail("session URL leaked the meetingName query");
    }
    await waitForBannerHeading(page, "新サービスの打ち合わせ");
    const namedUrl = page.url();
    const namedId = namedUrl.split("/").pop() ?? "";
    const banner = page.getByRole("banner");
    if (!(await banner.getByRole("img", { name: "reqlogue" }).isVisible())) {
      fail("session wordmark missing");
    }
    const storedNamed = await meetingState(page);
    if (storedNamed.keys.length !== 1) {
      fail(`expected one meeting record, got ${JSON.stringify(storedNamed.keys)}`);
    }
    if (!storedNamed.records[0]?.value?.includes("新サービスの打ち合わせ")) {
      fail("meeting record did not persist the typed name");
    }
    await page.reload();
    await page
      .getByRole("banner")
      .getByRole("heading", { name: "新サービスの打ち合わせ" })
      .waitFor();
    const afterNamed = await capture(page, dir, "03-session-named");

    await openPrepare(page);
    await page.getByRole("textbox", { name: "会議名" }).fill("旧会議");
    await page.getByRole("button", { name: "次へ" }).click();
    await page.waitForURL(UUID_SESSION);
    const firstKeys = await meetingState(page);
    const firstUrl = page.url();
    await openPrepare(page);
    await page.getByRole("textbox", { name: "会議名" }).fill("新会議");
    await page.getByRole("button", { name: "次へ" }).click();
    await page.waitForURL(UUID_SESSION);
    await waitForBannerHeading(page, "新会議");
    const secondKeys = await meetingState(page);
    if (secondKeys.keys.length !== 1) {
      fail("replacement must leave exactly one meeting record");
    }
    if (secondKeys.keys[0] === firstKeys.keys[0]) {
      fail("replacement reused the previous meeting storage key");
    }
    await page.goto(firstUrl);
    await waitForSessionShell(page);
    if ((await page.getByRole("heading", { name: "旧会議" }).count()) !== 0) {
      fail("old meeting name survived replacement");
    }
    const afterReplace = await capture(page, dir, "04-session-replaced");

    return {
      feature: "home-start",
      entry: "home link はじめる then prepare 次へ",
      before,
      prepare,
      filled,
      afterNamed,
      afterReplace,
      namedUrl,
      namedId,
      firstUrl,
      storedNamed,
      firstKeys,
      secondKeys,
    };
  });
}

async function driveSessionBanner(dir) {
  return withBrowser(async (page) => {
    const started = await startNamedSession(page, "新サービスの打ち合わせ");
    await waitForBannerHeading(page, "新サービスの打ち合わせ");
    const banner = page.getByRole("banner");
    if ((await banner.getByRole("button").count()) !== 0) {
      fail("session banner must have no buttons");
    }
    if ((await banner.getByRole("link").count()) !== 0) {
      fail("session banner must have no links");
    }
    if ((await page.getByText("自動更新").count()) !== 0) {
      fail("retired 自動更新 copy is visible");
    }
    if ((await page.getByText("マインドマップ").count()) !== 0) {
      fail("retired マインドマップ copy is visible");
    }
    const named = await capture(page, dir, "00-named");
    return {
      feature: "session-banner",
      entry: "home link はじめる then prepare 次へ then session banner",
      named,
      namedUrl: started.url,
    };
  });
}

async function driveMeetingCapture(dir) {
  const happy = await withBrowser(async (page) => {
    await installFakeCapture(page);
    const started = await startNamedSession(page, "新サービスの打ち合わせ");
    const idle = await capture(page, dir, "00-idle");
    await page.getByRole("button", { name: "会議を開始" }).click();
    await page.getByRole("button", { name: "会議を終了" }).waitFor();
    const capturing = await capture(page, dir, "01-capturing");
    if ((await page.getByText("stub transcript").count()) !== 0) {
      fail("transcript text leaked into the visible session UI");
    }
    await page.waitForFunction((prefix) => {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .some((key) =>
          (localStorage.getItem(key) ?? "").includes("stub transcript"),
        );
    }, MEETING_PREFIX);
    const stored = await meetingState(page);
    await page.getByRole("button", { name: "会議を終了" }).click();
    await page.getByRole("button", { name: "会議を開始" }).waitFor();
    await page.waitForFunction((prefix) => {
      return (
        Object.keys(localStorage).filter((key) => key.startsWith(prefix))
          .length === 0
      );
    }, MEETING_PREFIX);
    const ended = await capture(page, dir, "02-ended");
    const afterStop = await meetingState(page);
    if (afterStop.keys.length !== 0) {
      fail("ending the meeting did not clear the stored record");
    }
    return {
      meetingId: started.meetingId,
      idle,
      capturing,
      ended,
      storedWhileCapturing: stored,
      storedAfterEnd: afterStop,
    };
  });

  const denied = await withBrowser(async (page) => {
    await installDeniedCapture(page);
    await startNamedSession(page, "権限のない会議");
    await page.getByRole("button", { name: "会議を開始" }).click();
    const deniedMessage = "画面とマイクの共有が必要です";
    const status = page.getByRole("status").filter({ hasText: deniedMessage });
    await status.waitFor();
    const message = ((await status.textContent()) ?? "").trim();
    if (message !== deniedMessage) {
      fail(`expected permission-denied status, got ${JSON.stringify(message)}`);
    }
    if (!(await page.getByRole("button", { name: "会議を開始" }).isVisible())) {
      fail("permission-denied path must return to 会議を開始");
    }
    const shot = await capture(page, dir, "03-permission-denied");
    return { message, shot };
  });

  return {
    feature: "meeting-capture",
    entry: "session 会議を開始 / 会議を終了",
    ...happy,
    denied,
  };
}

async function driveTranscriptionApi(dir) {
  if (!withApi) {
    fail(
      "unmet precondition: FastAPI was not launched. Re-run helpers/launch --with-api, then helpers/drive transcription-api.",
    );
  }
  const healthRes = await fetch(`${apiUrl}/health`, {
    signal: AbortSignal.timeout(15_000),
  });
  const healthBody = await healthRes.text();
  if (healthRes.status !== 200 || healthBody !== '{"status":"ok"}') {
    fail(`GET /health failed: ${healthRes.status} ${healthBody}`);
  }
  const transcribeRes = await fetch(`${apiUrl}/v1/transcription`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: Buffer.from([0, 1]),
    signal: AbortSignal.timeout(15_000),
  });
  const transcribeJson = await transcribeRes.json();
  if (transcribeRes.status !== 200) {
    fail(`POST /v1/transcription failed: ${transcribeRes.status}`);
  }
  if (transcribeJson.text !== "stub transcript") {
    fail(`expected stub transcript, got ${JSON.stringify(transcribeJson)}`);
  }
  if ("speaker" in transcribeJson) {
    fail("transcript response must not include speaker");
  }
  const result = {
    feature: "transcription-api",
    entry: "POST /v1/transcription against the stub FastAPI",
    health: { status: healthRes.status, body: healthBody },
    transcribe: { status: transcribeRes.status, body: transcribeJson },
  };
  await writeJson(path.join(dir, "http.json"), result);
  return result;
}

const drivers = {
  "home-start": driveHomeStart,
  "session-banner": driveSessionBanner,
  "meeting-capture": driveMeetingCapture,
  "transcription-api": driveTranscriptionApi,
};

const driver = drivers[feature];
if (!driver) {
  fail(`unknown feature ${feature}`);
}

const dir = path.join(evidenceRoot, feature);
await mkdir(dir, { recursive: true });
const result = await driver(dir);
result.capturedAt = new Date().toISOString();
result.webUrl = webUrl;
result.evidenceDir = dir;
await writeJson(path.join(dir, "result.json"), result);
console.log(`proved ${feature}`);
console.log(`evidence ${dir}`);
console.log(JSON.stringify(result, null, 2));
