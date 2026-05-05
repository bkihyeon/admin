import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "db-writes",
      testMatch:
        /(golden-path|duties-rerun-warnings|office-isolation)\.spec\.ts/,
      workers: 1,
    },
    {
      name: "read-mostly",
      testMatch: /crud-(employees|duty-items|offices)\.spec\.ts/,
      workers: 4,
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // CRITICAL: Next.js는 .env.local > .env.test 우선이라
      // .env.test 자동 로드에 의존하면 prod DB 파괴 위험.
      // 반드시 명시 주입.
      DATABASE_URL: process.env.DATABASE_URL_TEST!,
    },
  },
});
