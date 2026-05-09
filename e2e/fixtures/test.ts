import { test as base, expect, type Page } from "@playwright/test";
import {
  truncateAll,
  seedOffice,
  seedEmployees,
  seedDutyItems,
  type Office,
} from "./db";

// =====================================================
// Dialog 헬퍼 — 네이티브 confirm/alert는 반드시 이걸로만 처리
// =====================================================
export const acceptDialog = (page: Page, expectedText?: string) =>
  page.once("dialog", async (d) => {
    if (expectedText) expect(d.message()).toContain(expectedText);
    await d.accept();
  });

// =====================================================
// db fixture
// =====================================================
type DbFixture = {
  truncate: () => Promise<void>;
  seedOffice: (name: string) => Promise<Office>;
  seedEmployees: (officeId: string, names: string[]) => Promise<void>;
  seedDutyItems: (
    officeId: string,
    items: { name: string; requiredCount: number }[],
  ) => Promise<void>;
};

export const test = base.extend<{ db: DbFixture }>({
  db: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use({
      truncate: truncateAll,
      seedOffice,
      seedEmployees,
      seedDutyItems,
    });
  },
});

// 모든 spec에서: truncate + storage 초기화
test.beforeEach(async ({ context, page, db }) => {
  await db.truncate();
  await context.clearCookies();
  // origin 확보 후 localStorage 접근 (about:blank에서는 접근 불가)
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

export { expect };
