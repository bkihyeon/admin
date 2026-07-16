import {
  acceptDialog,
  closeFlipModalOnly,
  completeFlipModal,
  expect,
  test,
} from "../fixtures/test";

/**
 * append-only 버전화 회귀 스펙.
 * 배경: (month, office) upsert 덮어쓰기로 이전 배정이 소실된 사고의 재발 방지.
 * 재뽑기는 새 버전을 쌓고(v1 불변), UI에서 버전을 앞뒤로 탐색할 수 있어야 한다.
 */

const MONTH = new Date().toISOString().slice(0, 7);

async function selectOffice(
  page: import("@playwright/test").Page,
  name: string
) {
  await expect(
    page.locator("aside select").locator("option", { hasText: name })
  ).toHaveCount(1);
  await page.locator("aside select").selectOption({ label: name });
}

function pairs(cards: { employeeName: string; dutyItemName: string | null }[]) {
  return cards.map((c) => [c.employeeName, c.dutyItemName]);
}

test("재뽑기 후 v1이 원형 그대로 보존된다 (사고 회귀)", async ({
  page,
  db,
}) => {
  const office = await db.seedOffice("버전사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [
    { name: "빗자루", requiredCount: 2 },
    { name: "청소기", requiredCount: 1 },
  ]);

  await page.goto("/duties");
  await selectOffice(page, "버전사무소");

  // v1 뽑기 + 완료
  await page.getByRole("button", { name: /뽑기/ }).click();
  await completeFlipModal(page);

  const v1Res = await page.request.get(
    `/api/duties?month=${MONTH}&officeId=${office.id}`
  );
  const v1 = await v1Res.json();
  expect(v1.version).toBe(1);
  expect(v1.totalVersions).toBe(1);
  expect(v1.isLatest).toBe(true);

  // 재뽑기 (confirm) + 완료 → v2
  acceptDialog(page, "배정이 이미 있습니다");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await completeFlipModal(page);

  // v1은 superseded로 원형 그대로 남아야 한다
  const v1After = await (
    await page.request.get(
      `/api/duties?month=${MONTH}&officeId=${office.id}&version=1`
    )
  ).json();
  expect(v1After.isLatest).toBe(false);
  expect(pairs(v1After.cards)).toEqual(pairs(v1.cards));
  expect(v1After.freeEmployee).toEqual(v1.freeEmployee);

  // 최신은 v2
  const latest = await (
    await page.request.get(`/api/duties?month=${MONTH}&officeId=${office.id}`)
  ).json();
  expect(latest.version).toBe(2);
  expect(latest.totalVersions).toBe(2);

  // 범위 밖 버전은 404
  const notFound = await page.request.get(
    `/api/duties?month=${MONTH}&officeId=${office.id}&version=3`
  );
  expect(notFound.status()).toBe(404);
});

test("버전 내비게이터로 이전 버전을 read-only로 탐색", async ({ page, db }) => {
  const office = await db.seedOffice("내비사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [{ name: "빗자루", requiredCount: 2 }]);

  await page.goto("/duties");
  await selectOffice(page, "내비사무소");

  await page.getByRole("button", { name: /뽑기/ }).click();
  await completeFlipModal(page);

  // v1 단일 버전에서는 내비 없음
  await expect(page.getByTestId("version-nav")).not.toBeVisible();

  acceptDialog(page, "배정이 이미 있습니다");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await completeFlipModal(page);

  // v2 완료 후 내비 노출, 최신 보기
  await expect(page.getByTestId("version-label")).toHaveText(
    "2번째 뽑기 / 총 2회"
  );
  await expect(page.getByTestId("old-version-view")).not.toBeVisible();

  // ◀ 이전 버전: read-only 전체 공개 보기
  await page.getByTestId("version-prev").click();
  await expect(page.getByTestId("version-label")).toHaveText(
    "1번째 뽑기 / 총 2회"
  );
  await expect(page.getByText("이전 버전")).toBeVisible();
  const oldView = page.getByTestId("old-version-view");
  await expect(oldView).toBeVisible();
  await expect(oldView.getByText("빗자루")).toBeVisible();
  // 배정일시는 한 시점에 하나만 렌더 (strict mode 가드)
  await expect(page.getByText(/배정일시/)).toHaveCount(1);

  // ▶ 다시 최신으로
  await page.getByTestId("version-next").click();
  await expect(page.getByTestId("old-version-view")).not.toBeVisible();
  await expect(page.getByTestId("version-label")).toHaveText(
    "2번째 뽑기 / 총 2회"
  );
});

test("동시 뽑기 2건 → 둘 다 버전으로 보존 (소실 없음)", async ({
  page,
  db,
}) => {
  const office = await db.seedOffice("동시사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [{ name: "빗자루", requiredCount: 1 }]);

  await page.goto("/");
  const body = { month: MONTH, officeId: office.id };
  const [r1, r2] = await Promise.all([
    page.request.post("/api/duties", { data: body }),
    page.request.post("/api/duties", { data: body }),
  ]);
  expect(r1.status()).toBe(201);
  expect(r2.status()).toBe(201);

  const latest = await (
    await page.request.get(`/api/duties?month=${MONTH}&officeId=${office.id}`)
  ).json();
  expect(latest.totalVersions).toBe(2);
});

test("재뽑기 진행 중에도 이력 피드에 이전 완료본이 유지된다", async ({
  page,
  db,
}) => {
  const office = await db.seedOffice("이력사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [{ name: "빗자루", requiredCount: 2 }]);

  await page.goto("/duties");
  await selectOffice(page, "이력사무소");

  // v1 완료
  await page.getByRole("button", { name: /뽑기/ }).click();
  await completeFlipModal(page);

  // v2 시작만 하고 진행 중 상태로 방치
  acceptDialog(page, "배정이 이미 있습니다");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModalOnly(page);

  // 이력 피드에는 v1(완료본)이 계속 보인다
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: `${MONTH} 청소 배정` })
  ).toBeVisible();
  await expect(page.getByText("빗자루")).toBeVisible();
  await expect(page.getByTestId("version-label")).toHaveText(
    "1번째 뽑기 / 총 2회"
  );

  // ▶로 진행 중인 v2를 열면 내용 대신 진행 상태 안내
  await page.getByTestId("version-next").click();
  await expect(page.getByText(/진행 중인 뽑기입니다/)).toBeVisible();
});
