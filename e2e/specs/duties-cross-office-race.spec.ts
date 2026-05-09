import { test, expect } from "../fixtures/test";

/**
 * race 회귀 spec (T0b) — 두 사무실이 같은 월에 동시에 POST /api/duties를
 * 호출해도 양쪽 결과가 모두 DB에 보존되는지 검증.
 *
 * 결정성 전략:
 *  - 두 사무실에 대량 시드(사원 100명/dutyItems 5개)를 넣어 핸들러 처리 시간을
 *    인위적으로 늘리고, 두 번째 POST가 첫 번째의 read/update 사이에 끼어들도록
 *    race window를 키운다.
 *  - iteration 5회 반복, 단 1회라도 한쪽 결과가 누락되면 fail.
 *  - Phase 0(단일 SQL atomic JSONB merge) 적용 전 코드에서는 read-merge-upsert
 *    4단계 race로 거의 항상 fail (사전 측정 노출률 ≥ 95% 임계치 충족 상태).
 *  - Phase 0 이후에는 ON CONFLICT (month) row 락이 두 POST를 직렬화해 결정적 pass.
 *
 * 사전 측정 결과는 PR 본문 참조.
 */
test("두 사무실이 같은 월에 동시 뽑기를 해도 양쪽 결과가 모두 보존된다", async ({
  request,
  db,
}) => {
  test.setTimeout(180_000);

  const month = new Date().toISOString().slice(0, 7);

  const officeA = await db.seedOffice("RaceOffice-A");
  const officeB = await db.seedOffice("RaceOffice-B");

  const namesA = Array.from({ length: 100 }, (_, i) => `A직원${i + 1}`);
  const namesB = Array.from({ length: 100 }, (_, i) => `B직원${i + 1}`);
  await db.seedEmployees(officeA.id, namesA);
  await db.seedEmployees(officeB.id, namesB);

  const items = [
    { name: "빗자루", requiredCount: 20 },
    { name: "청소기", requiredCount: 20 },
    { name: "걸레", requiredCount: 20 },
    { name: "쓰레기통", requiredCount: 20 },
    { name: "공용화장실", requiredCount: 20 },
  ];
  await db.seedDutyItems(officeA.id, items);
  await db.seedDutyItems(officeB.id, items);

  const N = 5;
  for (let i = 0; i < N; i++) {
    const [resA, resB] = await Promise.all([
      request.post("/api/duties", {
        data: { month, officeId: officeA.id },
      }),
      request.post("/api/duties", {
        data: { month, officeId: officeB.id },
      }),
    ]);

    expect(
      resA.ok(),
      `iter ${i}: office A POST 실패 (${resA.status()})`,
    ).toBeTruthy();
    expect(
      resB.ok(),
      `iter ${i}: office B POST 실패 (${resB.status()})`,
    ).toBeTruthy();

    const listA = await (
      await request.get(`/api/duties?month=${month}&officeId=${officeA.id}`)
    ).json();
    const listB = await (
      await request.get(`/api/duties?month=${month}&officeId=${officeB.id}`)
    ).json();

    const dutyA = Array.isArray(listA) ? listA[0] : null;
    const dutyB = Array.isArray(listB) ? listB[0] : null;

    expect(
      dutyA?.assignments?.length ?? 0,
      `iter ${i}: A의 assignments 누락 (race 발생)`,
    ).toBeGreaterThan(0);
    expect(
      dutyB?.assignments?.length ?? 0,
      `iter ${i}: B의 assignments 누락 (race 발생)`,
    ).toBeGreaterThan(0);
  }
});
