import { test, expect, completeFlipModal } from "../fixtures/test";

test("등록 → 사원/항목 추가 → 뽑기 → 이력 확인 (전체 골든 패스)", async ({
  page,
}) => {
  // 1) 사무실 등록 — 사무실명은 main 카드 + aside select 양쪽 노출이라 main scope로 좁힘
  await page.goto("/offices");
  await page.getByPlaceholder("사무실 이름 입력").fill("테스트사무소");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(page.locator("main").getByText("테스트사무소")).toBeVisible();

  // 사이드바 select에 새 사무실이 노출될 때까지 대기 + 명시 선택 (자동 선택은 race 위험)
  await expect(
    page.locator("aside select").locator("option", { hasText: "테스트사무소" }),
  ).toHaveCount(1);
  await page.locator("aside select").selectOption({ label: "테스트사무소" });

  // 2) 사원 3명 등록
  await page.goto("/employees");
  // OfficeContext가 localStorage에서 selectedOfficeId 복원 후 사이드바에 반영될 때까지 대기.
  // 이 대기 없이 곧장 등록 누르면 selectedOfficeId가 null인 상태로 POST되어 셀 안 뜸 (CI 한정 재현).
  await expect(
    page.locator("aside select option:checked"),
  ).toHaveText("테스트사무소");
  for (const name of ["김철수", "이영희", "박민수"]) {
    await page.getByPlaceholder("이름 입력").fill(name);
    await page.getByRole("button", { name: "등록" }).click();
    await expect(page.getByRole("cell", { name })).toBeVisible();
  }

  // 3) 담당 항목 등록 (총 필요 인원 3명, 사원 수와 동일 → 미배정 없음)
  // 추가 폼 scope: button '추가'의 부모 flex row 안의 number input만 타겟
  await page.goto("/settings");
  const addRow = page.getByRole("button", { name: "추가" }).locator("xpath=..");
  await page.getByPlaceholder(/예: 빗자루/).fill("빗자루");
  await addRow.locator('input[type="number"]').fill("2");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(page.getByText("빗자루")).toBeVisible();

  await page.getByPlaceholder(/예: 빗자루/).fill("청소기");
  await addRow.locator('input[type="number"]').fill("1");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(page.getByText("청소기")).toBeVisible();

  // 4) 청소 배정 — 첫 실행은 confirm 없음. 뽑기 버튼은 selectedOfficeId 확정 후 enabled
  await page.goto("/duties");
  const drawBtn = page.getByRole("button", { name: /뽑기/ });
  await expect(drawBtn).toBeEnabled();
  await drawBtn.click();

  // CardFlipModal 등장 — 멀티유저 모드 전환 후 "전체 공개" 버튼은 제거됨.
  // completeFlipModal 헬퍼가 카드를 순차로 클릭해 allFlipped=true로 만든 뒤 '확인' 클릭.
  await completeFlipModal(page);

  // 결과 카드에 사원 이름 노출 (모달 닫힌 뒤 페이지의 결과 영역 검증)
  for (const name of ["김철수", "이영희", "박민수"]) {
    await expect(page.getByText(name).first()).toBeVisible();
  }

  // 5) 이력 페이지에 이번 달 row 표시
  const currentMonth = new Date().toISOString().slice(0, 7);
  await page.goto("/history");
  await expect(page.getByRole("button", { name: currentMonth })).toBeVisible();
});
