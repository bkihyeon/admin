import { test, expect } from "../fixtures/test";

/**
 * cross-office isolation 회귀 spec — 두 사무실이 같은 월에 동시에 POST /api/duties를
 * 호출해도 양쪽 결과가 모두 DB에 보존되는지 검증.
 *
 * Phase 0 시점: read-merge-upsert 4단계 race를 atomic JSONB merge로 봉쇄하는
 *   regression guard로 도입.
 * Phase 1 시점(현): schema가 (month, office_id) UNIQUE로 분할되어 두 office의
 *   동시 POST가 *서로 다른 row*에 INSERT됨. 즉 race 자체가 구조적으로 사라졌고
 *   본 spec은 "구조적 isolation 보장이 깨지지 않는지"의 회귀 가드 역할로 전환.
 *
 * 결정성 전략(여전히 유효):
 *  - 두 사무실에 대량 시드(사원 100명/dutyItems 5개)로 핸들러 처리 시간을 늘려
 *    iteration 5회 동시 POST → 양쪽 row 모두 보존됨을 확인.
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

    const dutyA = await (
      await request.get(`/api/duties?month=${month}&officeId=${officeA.id}`)
    ).json();
    const dutyB = await (
      await request.get(`/api/duties?month=${month}&officeId=${officeB.id}`)
    ).json();

    expect(
      dutyA?.cards?.length ?? 0,
      `iter ${i}: A의 cards 누락 (race 발생)`,
    ).toBeGreaterThan(0);
    expect(
      dutyB?.cards?.length ?? 0,
      `iter ${i}: B의 cards 누락 (race 발생)`,
    ).toBeGreaterThan(0);
  }
});
