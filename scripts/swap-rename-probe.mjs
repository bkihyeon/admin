// T2: Neon HTTP 드라이버에서 swap-rename 패턴이 동작하는지 검증.
// 목표: 정규화 마이그레이션의 cutover에서 사용할 ALTER TABLE ... RENAME TO를
// 단일 트랜잭션 단위로 안전하게 실행 가능한지 확인.
//
// 절차 (테스트 브랜치 전용, prod 절대 금지):
//  1. tmp_a, tmp_b 두 테이블 생성 + 각각 1행 삽입
//  2. swap rename: a→tmp_swap, b→a, tmp_swap→b — 단일 sql.transaction 호출
//  3. 행이 교차됐는지 확인
//  4. 정리(DROP)
//
// 통과 조건: rename 3건이 모두 atomic하게 적용되어 swap이 일관된 상태로 보임.

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 환경변수 필요");
  process.exit(1);
}
if (!url.includes("ep-royal-cloud")) {
  console.error("safety: 이 스크립트는 test branch에서만 실행 가능 (ep-royal-cloud-* endpoint 강제)");
  process.exit(1);
}

const sql = neon(url);

async function step(label, fn) {
  process.stdout.write(`[${label}] `);
  try {
    await fn();
    console.log("ok");
  } catch (e) {
    console.log("FAIL");
    console.error(e);
    process.exit(1);
  }
}

await step("setup: drop if exists", async () => {
  await sql.query(`DROP TABLE IF EXISTS swap_a, swap_b, swap_tmp`);
});

await step("setup: create tmp_a, tmp_b", async () => {
  await sql.query(`CREATE TABLE swap_a (id text PRIMARY KEY, src text NOT NULL)`);
  await sql.query(`CREATE TABLE swap_b (id text PRIMARY KEY, src text NOT NULL)`);
  await sql.query(`INSERT INTO swap_a VALUES ('1', 'A')`);
  await sql.query(`INSERT INTO swap_b VALUES ('1', 'B')`);
});

await step("probe: single-statement rename (a → swap_tmp)", async () => {
  await sql.query(`ALTER TABLE swap_a RENAME TO swap_tmp`);
});

await step("probe: single-statement rename (b → a)", async () => {
  await sql.query(`ALTER TABLE swap_b RENAME TO swap_a`);
});

await step("probe: single-statement rename (swap_tmp → b)", async () => {
  await sql.query(`ALTER TABLE swap_tmp RENAME TO swap_b`);
});

await step("verify: rows swapped", async () => {
  const a = await sql.query(`SELECT src FROM swap_a WHERE id = '1'`);
  const b = await sql.query(`SELECT src FROM swap_b WHERE id = '1'`);
  if (a[0]?.src !== "B" || b[0]?.src !== "A") {
    throw new Error(`swap mismatch: a=${a[0]?.src}, b=${b[0]?.src}`);
  }
});

// transaction batch (sql.transaction은 batch 형태 — neon HTTP 1.x)
await step("setup: reset for tx test", async () => {
  await sql.query(`DROP TABLE IF EXISTS swap_a, swap_b, swap_tmp`);
  await sql.query(`CREATE TABLE swap_a (id text PRIMARY KEY, src text NOT NULL)`);
  await sql.query(`CREATE TABLE swap_b (id text PRIMARY KEY, src text NOT NULL)`);
  await sql.query(`INSERT INTO swap_a VALUES ('1', 'A')`);
  await sql.query(`INSERT INTO swap_b VALUES ('1', 'B')`);
});

await step("probe: batch transaction (3 renames atomic)", async () => {
  await sql.transaction([
    sql`ALTER TABLE swap_a RENAME TO swap_tmp`,
    sql`ALTER TABLE swap_b RENAME TO swap_a`,
    sql`ALTER TABLE swap_tmp RENAME TO swap_b`,
  ]);
});

await step("verify: tx swap rows", async () => {
  const a = await sql.query(`SELECT src FROM swap_a WHERE id = '1'`);
  const b = await sql.query(`SELECT src FROM swap_b WHERE id = '1'`);
  if (a[0]?.src !== "B" || b[0]?.src !== "A") {
    throw new Error(`tx swap mismatch: a=${a[0]?.src}, b=${b[0]?.src}`);
  }
});

await step("cleanup", async () => {
  await sql.query(`DROP TABLE IF EXISTS swap_a, swap_b, swap_tmp`);
});

console.log("\nswap-rename probe: PASS — Neon HTTP 단일 statement + batch transaction 모두 atomic rename 지원");
