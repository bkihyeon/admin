import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  // 모든 spec이 공유 DB를 truncate하므로 전역 직렬화. project 분리(workers=1)는
  // 같은 project 내부만 직렬이고 project 간엔 병렬이라 race 잔존 → top-level로 통일.
  workers: 1,
  retries: 0,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
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
