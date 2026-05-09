// T1: duties 정규화 직전 baseline equivalency 측정.
// 읽기 전용. test/prod 양쪽에서 실행해 결과를 .omc/baselines/{env}.json으로 저장.
// 정규화 후 동일 스크립트의 "복원" 모드(아래 reconstructSql)로 재집계해 diff 0 검증.
//
// usage:
//   DATABASE_URL=... node scripts/duties-baseline.mjs test
//   DATABASE_URL=... node scripts/duties-baseline.mjs prod

import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const env = process.argv[2];
if (!env || !["test", "prod"].includes(env)) {
  console.error("usage: node scripts/duties-baseline.mjs <test|prod>");
  process.exit(1);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const url =
  env === "test"
    ? loadEnvFile(resolve(".env.test")).DATABASE_URL_TEST
    : loadEnvFile(resolve(".env.local")).DATABASE_URL;

if (!url) {
  console.error(`URL을 찾을 수 없음: env=${env} (.env.test의 DATABASE_URL_TEST / .env.local의 DATABASE_URL 확인)`);
  process.exit(1);
}

const sql = neon(url);

const queries = {
  totals: `
    SELECT
      COUNT(*)::int AS row_count,
      COUNT(DISTINCT month)::int AS month_count
    FROM duties
  `,
  perRow: `
    SELECT
      month,
      jsonb_array_length(assignments) AS assignments_len,
      jsonb_array_length(free_employees) AS free_len,
      (
        SELECT COUNT(DISTINCT elem->>'officeId')::int
        FROM jsonb_array_elements(assignments) elem
        WHERE elem->>'officeId' IS NOT NULL
      ) AS distinct_offices_in_assignments,
      created_at
    FROM duties
    ORDER BY month
  `,
  perOffice: `
    SELECT
      month,
      elem->>'officeId' AS office_id,
      elem->>'officeName' AS office_name,
      COUNT(*)::int AS assignment_count
    FROM duties, jsonb_array_elements(assignments) elem
    GROUP BY month, elem->>'officeId', elem->>'officeName'
    ORDER BY month, elem->>'officeId'
  `,
  // 정규화 후 재집계할 때 비교 기준이 될 핵심 셋:
  // 한 dutyItem에 여러 사원이 묶이므로 assignedEmployeeIds/Names를 unnest하여
  // (month, officeId, dutyItemId, slot_index, employeeId, employeeName) 멀티셋으로 펼친다.
  // slot_index는 동일 사원이 같은 dutyItem에 중복 배정되는 케이스(풀 소진 후 재셔플)를 보존.
  assignmentTuples: `
    SELECT
      d.month,
      elem->>'officeId' AS office_id,
      elem->>'dutyItemId' AS duty_item_id,
      elem->>'dutyItemName' AS duty_item_name,
      slot.ord AS slot_index,
      slot.employee_id,
      name.employee_name
    FROM
      duties d,
      jsonb_array_elements(d.assignments) elem,
      jsonb_array_elements_text(elem->'assignedEmployeeIds') WITH ORDINALITY AS slot(employee_id, ord),
      jsonb_array_elements_text(elem->'assignedEmployeeNames') WITH ORDINALITY AS name(employee_name, ord2)
    WHERE slot.ord = name.ord2
    ORDER BY d.month, elem->>'officeId', elem->>'dutyItemId', slot.ord
  `,
  freeEmployeeTuples: `
    SELECT
      month,
      elem->>'officeId' AS office_id,
      elem->'employeeNames' AS employee_names
    FROM duties, jsonb_array_elements(free_employees) elem
    ORDER BY month, elem->>'officeId'
  `,
};

const out = {};
for (const [k, q] of Object.entries(queries)) {
  out[k] = await sql.query(q);
}

mkdirSync(resolve(".omc/baselines"), { recursive: true });
const path = resolve(`.omc/baselines/${env}.json`);
writeFileSync(path, JSON.stringify(out, null, 2));

console.log(`baseline saved → ${path}`);
console.log(`  rows: ${out.totals[0]?.row_count ?? 0}`);
console.log(`  months: ${out.totals[0]?.month_count ?? 0}`);
console.log(`  assignment tuples: ${out.assignmentTuples.length}`);
console.log(`  free employee tuples: ${out.freeEmployeeTuples.length}`);
