import { config } from "dotenv";

config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { DutyItem, Employee, RecyclingState } from "../src/lib/types";

/** 레거시 JSON 구조 (마이그레이션 이전 형식) */
interface LegacyCleaningDuty {
  id: string;
  month: string;
  assignments: unknown[];
  freeEmployeeNames: string[];
  createdAt: string;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL이 없습니다. .env.local 확인 바람.");
}
const sql = neon(databaseUrl);

function readJson<T>(filename: string): T {
  const filePath = path.join(process.cwd(), "data", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

async function migrateEmployees() {
  const list = readJson<Employee[]>("employees.json");
  for (const e of list) {
    await sql`
      INSERT INTO employees (id, name, created_at)
      VALUES (${e.id}, ${e.name}, ${e.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ employees: ${list.length}건`);
}

async function migrateDutyItems() {
  const list = readJson<DutyItem[]>("duty-items.json");
  for (const i of list) {
    await sql`
      INSERT INTO duty_items (id, name, required_count)
      VALUES (${i.id}, ${i.name}, ${i.requiredCount})
      ON CONFLICT (id) DO NOTHING
    `;
  }
  console.log(`✓ duty_items: ${list.length}건`);
}

async function migrateDuties() {
  const list = readJson<LegacyCleaningDuty[]>("duties.json");
  for (const d of list) {
    await sql`
      INSERT INTO duties (id, month, assignments, free_employee_names, created_at)
      VALUES (
        ${d.id},
        ${d.month},
        ${JSON.stringify(d.assignments)}::jsonb,
        ${JSON.stringify(d.freeEmployeeNames)}::jsonb,
        ${d.createdAt}
      )
      ON CONFLICT (month) DO NOTHING
    `;
  }
  console.log(`✓ duties: ${list.length}건`);
}

async function migrateRecycling() {
  const state = readJson<RecyclingState>("recycling.json");
  const updatedAt = state.updatedAt || new Date().toISOString();
  await sql`
    INSERT INTO recycling_state (id, current_index, schedule, updated_at)
    VALUES (
      1,
      ${state.currentIndex},
      ${JSON.stringify(state.schedule)}::jsonb,
      ${updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      current_index = EXCLUDED.current_index,
      schedule = EXCLUDED.schedule,
      updated_at = EXCLUDED.updated_at
  `;
  console.log(
    `✓ recycling_state: currentIndex=${state.currentIndex}, schedule ${state.schedule.length}주`
  );
}

async function main() {
  console.log("이관 시작...\n");
  await migrateEmployees();
  await migrateDutyItems();
  await migrateDuties();
  await migrateRecycling();
  console.log("\n이관 완료");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("이관 실패:", err);
    process.exit(1);
  });
