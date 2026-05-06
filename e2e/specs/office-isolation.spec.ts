import { test, expect } from "../fixtures/test";

async function selectOffice(page: import("@playwright/test").Page, name: string) {
  await expect(
    page.locator("aside select").locator("option", { hasText: name }),
  ).toHaveCount(1);
  await page.locator("aside select").selectOption({ label: name });
}

async function closeFlipModal(page: import("@playwright/test").Page) {
  await expect(page.getByRole("heading", { name: "청소 배정 결과" })).toBeVisible();
  // '전체 공개'는 첫 상태에 항상 노출. isVisible()은 non-retrying이라 opacity
  // 트랜지션 중 false 반환 가능 → click()의 actionability 폴링에 위임.
  await page.getByRole("button", { name: "전체 공개" }).click();
  await page.getByRole("button", { name: "확인" }).click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" }),
  ).not.toBeVisible();
}

test("사무실 격리: A·B 배정이 JSONB merge로 모두 보존됨", async ({
  page,
  db,
}) => {
  const officeA = await db.seedOffice("AAA사무소");
  const officeB = await db.seedOffice("BBB사무소");
  await db.seedEmployees(officeA.id, ["A직원1", "A직원2"]);
  await db.seedEmployees(officeB.id, ["B직원1", "B직원2"]);
  await db.seedDutyItems(officeA.id, [{ name: "A빗자루", requiredCount: 2 }]);
  await db.seedDutyItems(officeB.id, [{ name: "B청소기", requiredCount: 2 }]);

  // A 사무실 사원만 보이는지
  await page.goto("/employees");
  await selectOffice(page, "AAA사무소");
  await expect(page.getByRole("cell", { name: "A직원1" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "B직원1" })).not.toBeVisible();

  // B 사무실로 전환 → B 사원만 보임
  await selectOffice(page, "BBB사무소");
  await expect(page.getByRole("cell", { name: "B직원1" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "A직원1" })).not.toBeVisible();

  // 같은 월 A 뽑기
  await page.goto("/duties");
  await selectOffice(page, "AAA사무소");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  // 같은 월 B 뽑기 (다른 사무실이라 confirm 없음, JSONB merge)
  await selectOffice(page, "BBB사무소");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  // history에서 A·B 모두 보존되었는지 확인
  const month = new Date().toISOString().slice(0, 7);
  await page.goto("/history");
  await selectOffice(page, "AAA사무소");
  await expect(page.getByRole("button", { name: month })).toBeVisible();
  await expect(page.getByText("A빗자루")).toBeVisible();

  await selectOffice(page, "BBB사무소");
  await expect(page.getByRole("button", { name: month })).toBeVisible();
  await expect(page.getByText("B청소기")).toBeVisible();
});
