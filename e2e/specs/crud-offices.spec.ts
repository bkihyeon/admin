import { acceptDialog, expect, test } from "../fixtures/test";

test("사무실 CRUD: 등록 → 사이드바 노출 → 삭제 → 사라짐", async ({ page }) => {
  await page.goto("/offices");

  // 등록 — '테스트오피스X'는 main 카드 + aside select option 양쪽에 나타나니 main scope로 좁힘
  const mainScope = page.locator("main");
  await page.getByPlaceholder("사무실 이름 입력").fill("테스트오피스X");
  await page.getByRole("button", { name: "추가" }).click();
  await expect(mainScope.getByText("테스트오피스X")).toBeVisible();

  // 사이드바 select에 option 추가됨
  await expect(
    page.locator("aside select").locator("option", { hasText: "테스트오피스X" })
  ).toHaveCount(1);

  // 삭제 (confirm) — 행은 flex justify-between div, 그 안 마지막 버튼이 Trash2
  acceptDialog(page, "삭제하시겠습니까");
  const officeRow = mainScope.locator("div.justify-between", {
    hasText: "테스트오피스X",
  });
  await officeRow.locator("button").last().click();

  // 리스트와 사이드바 select에서 사라짐
  await expect(mainScope.getByText("테스트오피스X")).not.toBeVisible();
  await expect(
    page.locator("aside select").locator("option", { hasText: "테스트오피스X" })
  ).toHaveCount(0);
});
