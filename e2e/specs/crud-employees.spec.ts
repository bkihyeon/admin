import { acceptDialog, expect, test } from "../fixtures/test";

test("사원 CRUD 사이클 (자기 사무실 격리)", async ({ page, db }) => {
  const office = await db.seedOffice("CRUD-E");

  await page.goto("/employees");
  // 사무실이 1개라 자동 선택됨
  await expect(
    page.locator("aside select").locator("option", { hasText: "CRUD-E" })
  ).toHaveCount(1);
  await page.locator("aside select").selectOption(office.id);

  // 등록
  await page.getByPlaceholder("이름 입력").fill("초기이름");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByRole("cell", { name: "초기이름" })).toBeVisible();

  // 수정 — 편집 input은 autoFocus(employees/page.tsx:155)라 :focus selector가 안전
  await page.getByRole("button", { name: /수정/ }).first().click();
  await page.locator("input:focus").fill("수정된이름");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("cell", { name: "수정된이름" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "초기이름" })).not.toBeVisible();

  // 삭제 (confirm)
  acceptDialog(page, "삭제하시겠습니까");
  await page.getByRole("button", { name: /삭제/ }).first().click();
  await expect(
    page.getByRole("cell", { name: "수정된이름" })
  ).not.toBeVisible();
});
