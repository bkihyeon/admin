import { test, expect, acceptDialog } from "../fixtures/test";

test("담당항목 CRUD 사이클", async ({ page, db }) => {
  const office = await db.seedOffice("CRUD-D");

  await page.goto("/settings");
  await expect(
    page.locator("aside select").locator("option", { hasText: "CRUD-D" }),
  ).toHaveCount(1);
  await page.locator("aside select").selectOption(office.id);

  // 등록 — 추가 폼 scope (button '추가'의 부모 flex row)로 number input ambiguity 회피
  const addRow = page.getByRole("button", { name: "추가" }).locator("xpath=..");
  await page.getByPlaceholder(/예: 빗자루/).fill("초기항목");
  await addRow.locator('input[type="number"]').fill("2");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(page.getByText("초기항목")).toBeVisible();
  await expect(page.getByText("2명")).toBeVisible();

  // 수정 — 편집 input은 autoFocus(settings/page.tsx:160)라 :focus selector가 안전
  await page.getByRole("button", { name: /수정/ }).first().click();
  await page.locator("input:focus").fill("수정항목");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("수정항목")).toBeVisible();

  // 삭제 (confirm)
  acceptDialog(page, "삭제하시겠습니까");
  await page.getByRole("button", { name: /삭제/ }).first().click();
  await expect(page.getByText("수정항목")).not.toBeVisible();
});
