import { test as base, expect, type Page } from "@playwright/test";
import {
  corruptRevealState,
  type Office,
  seedDutyItems,
  seedEmployees,
  seedOffice,
  truncateAll,
} from "./db";

// =====================================================
// Dialog 헬퍼 — 네이티브 confirm/alert는 반드시 이걸로만 처리
// =====================================================
export const acceptDialog = (page: Page, expectedText?: string) =>
  page.once("dialog", async (d) => {
    if (expectedText) expect(d.message()).toContain(expectedText);
    await d.accept();
  });

/**
 * CardFlipModal을 카드 flip 없이 X 버튼으로 닫는 헬퍼.
 * in-progress 상태를 유지(allFlipped=false)하여 진행 중 카드 + 강제 재뽑기 가드를
 * 검증하기 위해 사용.
 */
export async function closeFlipModalOnly(page: Page) {
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).not.toBeVisible();
}

/**
 * CardFlipModal에서 모든 카드를 순차로 클릭하여 게임을 종료한 뒤 모달을 닫는 헬퍼.
 * 멀티유저 모드 전환 후 "전체 공개" 버튼이 제거되어, 카드 개별 클릭으로 진행해야 함.
 */
export async function completeFlipModal(page: Page) {
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();
  // flip-card-N (N=숫자) 노드만 카운트, 자식 flip-card-N-item은 제외.
  const cardCount = await page.getByTestId(/^flip-card-\d+$/).count();
  for (let i = 0; i < cardCount; i++) {
    await page.getByTestId(`flip-card-${i}`).click();
    await expect(page.getByTestId(`flip-card-${i}-item`)).toBeVisible();
  }
  await page.getByRole("button", { name: "확인" }).click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).not.toBeVisible();
}

// =====================================================
// db fixture
// =====================================================
type DbFixture = {
  truncate: () => Promise<void>;
  seedOffice: (name: string) => Promise<Office>;
  seedEmployees: (officeId: string, names: string[]) => Promise<void>;
  seedDutyItems: (
    officeId: string,
    items: { name: string; requiredCount: number }[]
  ) => Promise<void>;
  corruptRevealState: (month: string, officeId: string) => Promise<void>;
};

export const test = base.extend<{ db: DbFixture }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture는 dependency 객체 destructure 위치가 강제됨.
  db: async ({}, use) => {
    await use({
      truncate: truncateAll,
      seedOffice,
      seedEmployees,
      seedDutyItems,
      corruptRevealState,
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
