import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST 환경변수가 필요합니다 (.env.test).");
}

export default defineConfig({
  testDir: "./e2e/specs",
  // CI는 GitHub runner(미국) → Neon(Singapore) RTT ~200ms 누적으로 로컬보다 5x 느림.
  // 쿼리 30~50회 × 200ms = 10s 추가 + Neon branch cold-wake로 추가 지연 가능.
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: process.env.CI ? 10_000 : 5_000 },
  fullyParallel: false,
  // 모든 spec이 공유 DB를 truncate하므로 전역 직렬화. project 분리(workers=1)는
  // 같은 project 내부만 직렬이고 project 간엔 병렬이라 race 잔존 → top-level로 통일.
  workers: 1,
  // CI 한정 transient Neon connection closed / cold-wake 흡수.
  retries: process.env.CI ? 2 : 0,
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
      DATABASE_URL: testDatabaseUrl,
    },
  },
});
