import { test, expect, acceptDialog } from "../fixtures/test";

async function selectOffice(page: import("@playwright/test").Page, name: string) {
  await expect(
    page.locator("aside select").locator("option", { hasText: name }),
  ).toHaveCount(1);
  await page.locator("aside select").selectOption({ label: name });
}

async function closeFlipModal(page: import("@playwright/test").Page) {
  await expect(page.getByRole("heading", { name: "청소 배정 결과" })).toBeVisible();
  // '전체 공개'가 있으면 누르고, 없으면 바로 '확인' (regex OR로 묶으면 transition 중 ambiguity 위험)
  const revealBtn = page.getByRole("button", { name: "전체 공개" });
  if (await revealBtn.isVisible()) await revealBtn.click();
  await page.getByRole("button", { name: "확인" }).click();
  await expect(
    page.getByRole("heading", { name: "청소 배정 결과" }),
  ).not.toBeVisible();
}

test("같은 월 재배정 confirm 후 새 결과 반영", async ({ page, db }) => {
  const office = await db.seedOffice("재배정사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바"]);
  await db.seedDutyItems(office.id, [
    { name: "빗자루", requiredCount: 2 },
    { name: "청소기", requiredCount: 1 },
  ]);

  await page.goto("/duties");
  await selectOffice(page, "재배정사무소");

  // 첫 뽑기
  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  // 두 번째 뽑기 — confirm 발생
  acceptDialog(page, "배정이 이미 있습니다");
  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  // 새 결과가 여전히 사원 이름으로 채워져 있어야 함
  for (const name of ["가나", "다라", "마바"]) {
    await expect(page.getByText(name).first()).toBeVisible();
  }
});

test("필요 인원 > 사원 수: warning alert 노출 + 중복 배정 진행", async ({
  page,
  db,
}) => {
  const office = await db.seedOffice("부족사무소");
  await db.seedEmployees(office.id, ["가나", "다라"]);
  await db.seedDutyItems(office.id, [
    { name: "빗자루", requiredCount: 3 },
    { name: "청소기", requiredCount: 2 },
  ]);

  await page.goto("/duties");
  await selectOffice(page, "부족사무소");

  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  // warning Alert 컴포넌트 노출 (서버 응답의 warning 문구)
  await expect(page.getByText(/필요 인원/)).toBeVisible();
});

test("미배정 사원 발생: 프리(미배정) 영역 노출", async ({ page, db }) => {
  const office = await db.seedOffice("프리사무소");
  await db.seedEmployees(office.id, ["가나", "다라", "마바", "사아", "자차"]);
  await db.seedDutyItems(office.id, [
    { name: "빗자루", requiredCount: 2 },
    { name: "청소기", requiredCount: 1 },
  ]);

  await page.goto("/duties");
  await selectOffice(page, "프리사무소");

  await page.getByRole("button", { name: /뽑기/ }).click();
  await closeFlipModal(page);

  await expect(page.getByText("프리 (미배정)")).toBeVisible();
});
