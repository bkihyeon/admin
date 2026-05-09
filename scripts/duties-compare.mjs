// T1 동반: 정규화 전/후 baseline 비교.
// pre.json (정규화 전 baseline), post.json (정규화 후 재집계) 멀티셋 동등성 검증.
//
// usage:
//   node scripts/duties-compare.mjs <pre.json> <post.json>
//
// 비교 항목:
//   - assignmentTuples : (month, officeId, dutyItemId, employeeId, employeeName, dutyItemName) 멀티셋
//   - freeEmployeeTuples : (month, officeId, employeeNames) 멀티셋
//   - totals.month_count : 정확히 일치
//   - perOffice : (month, officeId) 별 assignment_count 일치
//
// 의도적 제외:
//   - totals.row_count : schema 변경 시 row 단위가 달라지면 직접 비교 부적합
//   - created_at : 의미가 schema 형태에 따라 달라져 동등성 기준에서 제외
//
// 실패 시 어느 튜플이 차이 났는지 stdout에 출력하고 exit 1.

import { readFileSync } from "node:fs";

const [, , prePath, postPath] = process.argv;
if (!prePath || !postPath) {
  console.error("usage: node scripts/duties-compare.mjs <pre.json> <post.json>");
  process.exit(1);
}

const pre = JSON.parse(readFileSync(prePath, "utf8"));
const post = JSON.parse(readFileSync(postPath, "utf8"));

let failed = false;
function fail(msg) {
  failed = true;
  console.error(`FAIL: ${msg}`);
}

function multisetKey(obj, fields) {
  return JSON.stringify(fields.map((f) => obj[f] ?? null));
}

function diffMultiset(label, preRows, postRows, fields) {
  const preCount = new Map();
  const postCount = new Map();
  for (const r of preRows) {
    const k = multisetKey(r, fields);
    preCount.set(k, (preCount.get(k) ?? 0) + 1);
  }
  for (const r of postRows) {
    const k = multisetKey(r, fields);
    postCount.set(k, (postCount.get(k) ?? 0) + 1);
  }

  const missingInPost = [];
  const extraInPost = [];
  for (const [k, n] of preCount) {
    const m = postCount.get(k) ?? 0;
    if (m < n) missingInPost.push({ key: k, pre: n, post: m });
  }
  for (const [k, n] of postCount) {
    const m = preCount.get(k) ?? 0;
    if (m < n) extraInPost.push({ key: k, pre: m, post: n });
  }

  if (missingInPost.length || extraInPost.length) {
    fail(
      `${label} multiset diff (missing ${missingInPost.length}, extra ${extraInPost.length})`,
    );
    for (const x of missingInPost.slice(0, 10)) {
      console.error(`  missing in post: ${x.key} (pre=${x.pre}, post=${x.post})`);
    }
    for (const x of extraInPost.slice(0, 10)) {
      console.error(`  extra in post:   ${x.key} (pre=${x.pre}, post=${x.post})`);
    }
  } else {
    console.log(`OK: ${label} (${preRows.length} tuples)`);
  }
}

diffMultiset(
  "assignmentTuples",
  pre.assignmentTuples,
  post.assignmentTuples,
  ["month", "office_id", "duty_item_id", "duty_item_name", "slot_index", "employee_id", "employee_name"],
);

// freeEmployees는 employee_names가 jsonb 배열이라 stringify 정렬 후 비교
function normalizeFreeRows(rows) {
  return rows.map((r) => ({
    ...r,
    employee_names: Array.isArray(r.employee_names)
      ? [...r.employee_names].sort()
      : r.employee_names,
  }));
}
diffMultiset(
  "freeEmployeeTuples",
  normalizeFreeRows(pre.freeEmployeeTuples),
  normalizeFreeRows(post.freeEmployeeTuples),
  ["month", "office_id", "employee_names"],
);

const preMonths = pre.totals[0]?.month_count ?? 0;
const postMonths = post.totals[0]?.month_count ?? 0;
if (preMonths !== postMonths) {
  fail(`month_count mismatch: pre=${preMonths}, post=${postMonths}`);
} else {
  console.log(`OK: month_count = ${preMonths}`);
}

diffMultiset(
  "perOffice",
  pre.perOffice,
  post.perOffice,
  ["month", "office_id", "office_name", "assignment_count"],
);

if (failed) {
  console.error("\nbaseline diff: FAIL");
  process.exit(1);
}
console.log("\nbaseline diff: PASS — 정규화 전/후 데이터 동등성 검증 통과");
