import {
  acceptDialog,
  closeFlipModalOnly,
  expect,
  test,
} from "../fixtures/test";

/**
 * 진행 중 게임 가드 (in-progress-draw-guard-plan).
 * AC-3 메인 뽑기 disabled, AC-4/5 새로 뽑기 + confirm 승낙, AC-6 거부,
 * AC-7 cross-tab 폴링 동기화, AC-9 참가하기 보존,
 * AC-7-bis modal-open 탭의 cards 교체 + unflipped 재초기화.
 *
 * Cross-tab/polling 케이스는 1.5s polling RTT 변동을 감안해 timeout 10s + retries 1로 보정.
 */

const MONTH = new Date().toISOString().slice(0, 7);

// 첫 도입기 한정 flake guard. CI 안정화 후 제거 (plan §8 Risk 5 참조).
test.describe.configure({ retries: 1 });

async function setupOffice(db: {
  seedOffice: (name: string) => Promise<{ id: string; name: string }>;
  seedEmployees: (officeId: string, names: string[]) => Promise<void>;
  seedDutyItems: (
    officeId: string,
    items: { name: string; requiredCount: number }[]
  ) => Promise<void>;
}) {
  const office = await db.seedOffice("InProgressGuard");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [{ name: "빗자루", requiredCount: 2 }]);
  return office;
}

async function gotoDuties(
  page: import("@playwright/test").Page,
  officeId: string
) {
  await page.goto("/");
  await page.evaluate(
    ([id]) => localStorage.setItem("selectedOfficeId", id),
    [officeId]
  );
  await page.goto("/duties");
}

test("AC-3, AC-4: 진행 중 게임 → 메인 뽑기 disabled + 새로 뽑기/참가하기 노출", async ({
  page,
  db,
}) => {
  const office = await setupOffice(db);
  await gotoDuties(page, office.id);

  // 첫 뽑기 (UI 동선) → modal 자동 오픈
  await page.getByTestId("main-draw-btn").click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();

  // 카드 1장만 flip하여 in-progress (allFlipped=false) 유지
  await page.getByTestId("flip-card-0").click();
  await expect(page.getByTestId("flip-card-0-item")).toBeVisible();

  // modal만 닫음 (closeFlipModalOnly 헬퍼)
  await closeFlipModalOnly(page);

  await expect(page.getByText("진행 중인 게임이 있습니다")).toBeVisible();
  await expect(page.getByTestId("main-draw-btn")).toBeDisabled();
  await expect(page.getByTestId("rerun-btn")).toBeVisible();
  await expect(page.getByRole("button", { name: "참가하기" })).toBeVisible();
});

test("AC-5: 새로 뽑기 + confirm 승낙 → 새 게임 시작 + 모든 카드 unflipped", async ({
  page,
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 0 },
  });

  await gotoDuties(page, office.id);
  await expect(page.getByTestId("rerun-btn")).toBeVisible();

  acceptDialog(page, "현재 공개된 카드는 모두 사라집니다");
  await page.getByTestId("rerun-btn").click();

  // drawMutation onSuccess가 modal 자동 오픈
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();

  // 모든 카드 unflipped (item badge 미노출)
  const cardCount = await page.getByTestId(/^flip-card-\d+$/).count();
  expect(cardCount).toBeGreaterThan(0);
  for (let i = 0; i < cardCount; i++) {
    await expect(page.getByTestId(`flip-card-${i}-item`)).toHaveCount(0);
  }
});

test("AC-6: 새로 뽑기 + confirm 거부 → 기존 게임 유지", async ({
  page,
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 0 },
  });

  await gotoDuties(page, office.id);
  await expect(page.getByText(/1\/3 카드 공개됨/)).toBeVisible();

  page.once("dialog", async (d) => {
    expect(d.message()).toContain("현재 공개된 카드는 모두 사라집니다");
    await d.dismiss();
  });
  await page.getByTestId("rerun-btn").click();

  // 기존 진행 상태 그대로 (modal 미오픈, 1/3 유지)
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).not.toBeVisible();
  await expect(page.getByText(/1\/3 카드 공개됨/)).toBeVisible();
});

test("AC-9: 참가하기 → 진행 중 modal 재오픈", async ({ page, request, db }) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  await gotoDuties(page, office.id);
  await page.getByRole("button", { name: "참가하기" }).click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();
});

test("AC-7: 다른 탭에서 게임 진행 중 → 본 탭 메인 뽑기 자동 disabled", async ({
  browser,
  request,
  db,
}) => {
  const office = await setupOffice(db);

  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await gotoDuties(pageA, office.id);

  // 초기: 게임 없음 → 메인 버튼 enabled
  await expect(pageA.getByTestId("main-draw-btn")).toBeEnabled();

  // 다른 사용자(=request fixture)가 게임 시작
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  // 폴링(1.5s)으로 disabled 진입. CI 안전 margin 10s + interval 단계화.
  await expect
    .poll(() => pageA.getByTestId("main-draw-btn").isDisabled(), {
      timeout: 10000,
      intervals: [500, 1000, 1500],
    })
    .toBe(true);

  await ctxA.close();
});

test("AC-7-bis: 탭 A modal-open + 탭 B 새로 뽑기 → 탭 A modal cards 교체 + unflipped 재초기화", async ({
  browser,
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await gotoDuties(pageA, office.id);
  await gotoDuties(pageB, office.id);

  // 탭 A: 참가하기로 modal 오픈, card 0 flip
  await pageA.getByRole("button", { name: "참가하기" }).click();
  await expect(
    pageA.getByRole("heading", { name: "청소 배정 결과" })
  ).toBeVisible();
  await pageA.getByTestId("flip-card-0").click();
  await expect(pageA.getByTestId("flip-card-0-item")).toBeVisible();

  // 탭 B: 새로 뽑기 (rerun-btn 노출 대기)
  await expect(pageB.getByTestId("rerun-btn")).toBeVisible();
  acceptDialog(pageB, "현재 공개된 카드는 모두 사라집니다");
  await pageB.getByTestId("rerun-btn").click();

  // 탭 A: modal은 열린 채, polling으로 cards 새 게임 교체 → card 0 item 사라짐 (unflipped 재초기화)
  await expect
    .poll(() => pageA.getByTestId("flip-card-0-item").count(), {
      timeout: 10000,
      intervals: [500, 1000, 1500],
    })
    .toBe(0);

  await ctxA.close();
  await ctxB.close();
});
