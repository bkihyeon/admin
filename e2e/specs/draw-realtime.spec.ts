import { test, expect } from "../fixtures/test";

/**
 * 실시간 멀티유저 카드 뽑기 모드 (realtime-draw-consensus-plan v4) 검증.
 * AC 매핑:
 *  - AC-1, AC-3: dutyItemName 마스킹 + freeEmployee null
 *  - AC-2: 1.5s 이내 동기화 (두 BrowserContext)
 *  - AC-4: allFlipped → freeEmployee 노출
 *  - AC-5: reload 시 revealState 복원
 *  - AC-6, AC-12: 동일 cardIndex 두 번 flip → flippedAt + createdAt 보존
 *  - AC-7, AC-7-bis: 새 게임 POST 시 revealState 초기화
 *  - AC-9: allFlipped 후 polling 멈춤
 *  - AC-13: invalid cardIndex → 404
 *  - AC-15: length mismatch → 500
 */

const MONTH = new Date().toISOString().slice(0, 7);

async function setupOffice(db: {
  seedOffice: (name: string) => Promise<{ id: string; name: string }>;
  seedEmployees: (officeId: string, names: string[]) => Promise<void>;
  seedDutyItems: (
    officeId: string,
    items: { name: string; requiredCount: number }[],
  ) => Promise<void>;
}) {
  const office = await db.seedOffice("DrawTest");
  await db.seedEmployees(office.id, ["A", "B", "C"]);
  await db.seedDutyItems(office.id, [{ name: "빗자루", requiredCount: 2 }]);
  return office;
}

test("AC-1, AC-3: 새 게임 GET 응답에서 dutyItemName 마스킹 + freeEmployee null", async ({
  request,
  db,
}) => {
  const office = await setupOffice(db);

  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  const res = await request.get(
    `/api/duties?month=${MONTH}&officeId=${office.id}`,
  );
  expect(res.ok()).toBeTruthy();
  const data = await res.json();

  expect(data.cards.length).toBe(3); // 사원 3명 = 카드 3장 (2 배정 + 1 free)
  expect(data.cards.every((c: { dutyItemName: string | null }) => c.dutyItemName === null)).toBe(
    true,
  );
  expect(data.cards.every((c: { isFlipped: boolean }) => c.isFlipped === false)).toBe(true);
  expect(data.allFlipped).toBe(false);
  expect(data.freeEmployee).toBeNull();
  // employeeName은 항상 노출
  expect(data.cards.every((c: { employeeName: string }) => typeof c.employeeName === "string")).toBe(
    true,
  );
});

test("AC-13: invalid cardIndex (음수, 정수 아님, 범위 밖) → 404", async ({
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  // 음수
  const r1 = await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: -1 },
  });
  expect(r1.status()).toBe(404);

  // 범위 밖 (카드 3장이라 idx 999 초과)
  const r2 = await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 999 },
  });
  expect(r2.status()).toBe(404);

  // 정수 아님 → 입력 검증 400
  const r3 = await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 1.5 },
  });
  expect(r3.status()).toBe(400);

  // 없는 (month, officeId) → no-row 404
  const r4 = await request.post("/api/duties/flip", {
    data: { month: "1970-01", officeId: office.id, cardIndex: 0 },
  });
  expect(r4.status()).toBe(404);
});

test("AC-6, AC-12: idempotent flip — 동일 cardIndex 두 번 → flippedAt 보존, createdAt 동일", async ({
  request,
  db,
}) => {
  const office = await setupOffice(db);
  const postRes = await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  const post = await postRes.json();
  const createdAt0 = post.duty.createdAt;

  const f1 = await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 0 },
  });
  expect(f1.ok()).toBeTruthy();
  const d1 = await f1.json();
  const flippedAt0 = d1.cards[0].flippedAt;
  expect(flippedAt0).not.toBeNull();
  expect(d1.cards[0].isFlipped).toBe(true);
  expect(d1.cards[0].dutyItemName).not.toBeNull();
  expect(d1.createdAt).toBe(createdAt0);

  // 두 번째 호출
  const f2 = await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 0 },
  });
  expect(f2.ok()).toBeTruthy();
  const d2 = await f2.json();
  expect(d2.cards[0].flippedAt).toBe(flippedAt0); // 첫 값 보존
  expect(d2.createdAt).toBe(createdAt0); // createdAt 보존
});

test("AC-4: 모든 카드 flip → allFlipped=true, freeEmployee 노출", async ({
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  const cardCount = 3;
  let lastResp: {
    allFlipped: boolean;
    freeEmployee: unknown;
    cards: { dutyItemName: string | null }[];
  } | null = null;
  for (let i = 0; i < cardCount; i++) {
    const r = await request.post("/api/duties/flip", {
      data: { month: MONTH, officeId: office.id, cardIndex: i },
    });
    expect(r.ok()).toBeTruthy();
    lastResp = await r.json();
  }
  expect(lastResp).not.toBeNull();
  expect(lastResp!.allFlipped).toBe(true);
  expect(lastResp!.freeEmployee).not.toBeNull();
  expect(lastResp!.cards.every((c) => c.dutyItemName !== null)).toBe(true);
});

test("AC-7: 새 게임 POST → revealState 초기화", async ({ request, db }) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 0 },
  });

  // 새 게임
  const post2 = await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  expect(post2.ok()).toBeTruthy();
  const d = (await post2.json()).duty;
  expect(d.cards.every((c: { isFlipped: boolean }) => c.isFlipped === false)).toBe(true);
  expect(d.cards.every((c: { dutyItemName: string | null }) => c.dutyItemName === null)).toBe(true);
  expect(d.allFlipped).toBe(false);
});

test("AC-15: revealState length mismatch → GET 500", async ({ request, db }) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });

  await db.corruptRevealState(MONTH, office.id);

  const res = await request.get(
    `/api/duties?month=${MONTH}&officeId=${office.id}`,
  );
  expect(res.status()).toBe(500);
});

test("AC-2: 두 탭에서 한쪽 카드 flip → 다른 탭이 polling으로 동기화", async ({
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

  // 두 탭 모두 office 선택 후 진입
  for (const p of [pageA, pageB]) {
    await p.goto("/");
    await p.evaluate(
      ([id]) => localStorage.setItem("selectedOfficeId", id),
      [office.id],
    );
    await p.goto("/duties");
    // 카드 모달이 자동으로 열리지 않으므로 — 게임을 만든 뒤 진입한 상태.
    // duty.cards.length > 0이지만 modal은 닫혀 있고 "계속하기" 버튼이 보임.
    await p.getByRole("button", { name: /계속하기/ }).click();
    await p.getByTestId("flip-card-0").waitFor({ state: "visible" });
  }

  // A에서 카드 0 클릭
  await pageA.getByTestId("flip-card-0").click();
  // A에서 즉시 reveal (mutation onSuccess)
  await expect(pageA.getByTestId("flip-card-0-item")).toBeVisible({ timeout: 4000 });
  // B는 polling으로 1.5s 이내(+ RTT) 동기화. CI 안전 margin으로 4s.
  await expect(pageB.getByTestId("flip-card-0-item")).toBeVisible({ timeout: 4000 });

  await ctxA.close();
  await ctxB.close();
});

test("AC-9: 전 카드 flip 후 polling 멈춤 (1.5s 동안 추가 GET 0건)", async ({
  page,
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  // 서버 측에서 모든 카드 flip → allFlipped=true 상태로 진입
  for (let i = 0; i < 3; i++) {
    await request.post("/api/duties/flip", {
      data: { month: MONTH, officeId: office.id, cardIndex: i },
    });
  }

  await page.goto("/");
  await page.evaluate(
    ([id]) => localStorage.setItem("selectedOfficeId", id),
    [office.id],
  );

  const dutyGetUrls: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/api/duties?") && req.method() === "GET") {
      dutyGetUrls.push(url);
    }
  });

  await page.goto("/duties");
  // 첫 query 1회 발생 대기
  await expect(page.getByText(/배정일시/)).toBeVisible({ timeout: 5000 });
  const baselineCount = dutyGetUrls.length;
  // allFlipped=true이므로 polling은 멈춰야 함. 1500 + margin 동안 추가 GET 없음.
  await page.waitForTimeout(2000);
  expect(dutyGetUrls.length - baselineCount).toBe(0);
});

test("AC-5: 진행 중 reload → flipped 카드만 dutyItemName 공개", async ({
  page,
  request,
  db,
}) => {
  const office = await setupOffice(db);
  await request.post("/api/duties", {
    data: { month: MONTH, officeId: office.id },
  });
  await request.post("/api/duties/flip", {
    data: { month: MONTH, officeId: office.id, cardIndex: 1 },
  });

  await page.goto("/");
  await page.evaluate(
    ([id]) => localStorage.setItem("selectedOfficeId", id),
    [office.id],
  );
  await page.goto("/duties");
  await page.getByRole("button", { name: /계속하기/ }).click();

  // card 1만 공개
  await expect(page.getByTestId("flip-card-1-item")).toBeVisible({ timeout: 4000 });
  // card 0과 2는 미공개 (item 노출 안 됨)
  await expect(page.getByTestId("flip-card-0-item")).toHaveCount(0);
  await expect(page.getByTestId("flip-card-2-item")).toHaveCount(0);
});
