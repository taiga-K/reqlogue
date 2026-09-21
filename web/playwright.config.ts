import { defineConfig, devices } from "@playwright/test";

const port = 3217;
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/*.example.spec.ts", "**/*.example.spec.tsx"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${String(port)}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_MOCKING: "enabled",
    },
  },
});
