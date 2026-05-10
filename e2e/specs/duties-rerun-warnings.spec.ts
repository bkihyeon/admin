import { test, expect, acceptDialog, completeFlipModal } from "../fixtures/test";

async function selectOffice(page: import("@playwright/test").Page, name: string) {
  await expect(
    page.locator("aside select").locator("option", { hasText: name }),
  ).toHaveCount(1);
  await page.locator("aside select").selectOption({ label: name });
}

const closeFlipModal = completeFlipModal;

/**
 * 본 spec은 **완료된 게임**(allFlipped=true) 재뽑기 경로를 검증한다.
 * closeFlipModal=completeFlipModal이 모든 카드를 flip해 allFlipped=true로 만들고
 * 모달을 닫으므로, 두 번째 "뽑기" 클릭 시점은 메인 버튼이 enabled 상태이고 기존
 * "배정이 이미 있습니다" confirm이 트리거된다. 진행 중(allFlipped=false) 게임에서
 * 메인 버튼이 disabled되고 별도 "새로 뽑기"로 라우팅되는 시나리오는
 * `duties-in-progress-guard.spec.ts`에서 분리 검증.
 */
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
