// T4: 정규화 후 baseline 재집계.
// 새 schema (month, office_id 분할 row, free_employee 단수)에서 동일 멀티셋을 추출해
// pre.json과 동등성 비교 가능한 형태로 저장.

import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const env = process.argv[2];
if (!env || !["test", "prod"].includes(env)) {
  console.error("usage: node scripts/duties-baseline-post.mjs <test|prod>");
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
  console.error(`URL을 찾을 수 없음: env=${env}`);
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
  // 정규화 후 row 단위는 (month, office_id). per-office는 row 그대로 추출.
  perOffice: `
    SELECT
      month,
      office_id,
      (assignments->0->>'officeName') AS office_name,
      jsonb_array_length(assignments)::int AS assignment_count
    FROM duties
    WHERE jsonb_array_length(assignments) > 0
    ORDER BY month, office_id
  `,
  // assignment tuples: pre 동일 멀티셋 (month, office_id, duty_item_id, duty_item_name, slot_index, employee_id, employee_name)
  // pre는 office_id가 NULL인 케이스를 elem->>'officeId'로 추출 → text NULL.
  // post는 row의 office_id 컬럼을 사용.
  assignmentTuples: `
    SELECT
      d.month,
      d.office_id,
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
    ORDER BY d.month, d.office_id, elem->>'dutyItemId', slot.ord
  `,
  // free_employee 단수 → pre format(배열 elem)으로 다시 펼쳐 동등 비교 가능하게.
  freeEmployeeTuples: `
    SELECT
      month,
      office_id,
      free_employee->'employeeNames' AS employee_names
    FROM duties
    WHERE free_employee IS NOT NULL
    ORDER BY month, office_id
  `,
  // perRow는 비교 대상에서 제외(스키마 자체가 다름).
  perRow: `SELECT month, office_id, jsonb_array_length(assignments) AS assignments_len FROM duties ORDER BY month, office_id`,
};

const out = {};
for (const [k, q] of Object.entries(queries)) {
  out[k] = await sql.query(q);
}

mkdirSync(resolve(".omc/baselines"), { recursive: true });
const path = resolve(`.omc/baselines/${env}.post.json`);
writeFileSync(path, JSON.stringify(out, null, 2));

console.log(`post baseline saved → ${path}`);
console.log(`  rows: ${out.totals[0]?.row_count ?? 0}`);
console.log(`  months: ${out.totals[0]?.month_count ?? 0}`);
console.log(`  assignment tuples: ${out.assignmentTuples.length}`);
console.log(`  free employee tuples: ${out.freeEmployeeTuples.length}`);
