/**
 * 일회성 마이그레이션: duties JSONB 내 officeId가 null인 assignments/freeEmployees에
 * 실제 사무실 ID를 채워넣는다.
 *
 * 방법: 각 assignment의 dutyItemId로 duty_items 테이블을 조회하여 officeId를 가져옴.
 *
 * 실행: pnpm tsx scripts/migrate-duty-office-ids.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL이 없습니다. .env.local 확인 바람.");
}
const sql = neon(databaseUrl);

interface DutyRow {
  id: string;
  month: string;
  assignments: Array<{
    dutyItemId: string;
    dutyItemName: string;
    officeId: string | null;
    officeName: string | null;
    assignedEmployeeIds: string[];
    assignedEmployeeNames: string[];
  }>;
  free_employees: Array<{
    officeId: string | null;
    officeName: string | null;
    employeeNames: string[];
  }>;
}

async function main() {
  // 1. duty_items의 officeId 매핑
  const dutyItems = await sql`SELECT id, office_id FROM duty_items`;
  const itemOfficeMap = new Map<string, string | null>();
  for (const item of dutyItems) {
    itemOfficeMap.set(item.id, item.office_id);
  }

  // 2. offices 매핑
  const offices = await sql`SELECT id, name FROM offices`;
  const officeNameMap = new Map<string, string>();
  for (const o of offices) {
    officeNameMap.set(o.id, o.name);
  }

  console.log(
    `사무실 ${offices.length}개, 담당항목 ${dutyItems.length}개 조회 완료`
  );

  // 3. 모든 duties 조회
  const duties =
    (await sql`SELECT id, month, assignments, free_employees FROM duties`) as DutyRow[];
  console.log(`배정 기록 ${duties.length}개 조회`);

  let updatedCount = 0;

  for (const duty of duties) {
    let changed = false;

    // assignments의 null officeId 채우기
    const newAssignments = duty.assignments.map((a) => {
      if (a.officeId) return a;

      const itemOfficeId = itemOfficeMap.get(a.dutyItemId);
      if (!itemOfficeId) {
        console.warn(
          `  [${duty.month}] dutyItem ${a.dutyItemId} (${a.dutyItemName})의 officeId를 찾을 수 없음, 건너뜀`
        );
        return a;
      }

      changed = true;
      return {
        ...a,
        officeId: itemOfficeId,
        officeName: officeNameMap.get(itemOfficeId) ?? null,
      };
    });

    // freeEmployees 처리: 레거시 string[] 또는 officeId 누락 처리
    const usedOfficeIds = new Set(
      newAssignments.map((a) => a.officeId).filter(Boolean)
    );
    const inferredId: string | null =
      usedOfficeIds.size === 1 ? ([...usedOfficeIds][0] ?? null) : null;

    const newFreeEmployees = duty.free_employees.map((f) => {
      // 레거시: 문자열이 풀린 경우 {"0":"오","1":"하",...} → employeeNames 복원
      if (!f.employeeNames) {
        const numKeys = Object.keys(f)
          .filter((k) => /^\d+$/.test(k))
          .sort((a, b) => +a - +b);
        const name = numKeys
          .map((k) => (f as unknown as Record<string, string>)[k])
          .join("");
        changed = true;
        return {
          officeId: f.officeId || inferredId,
          officeName:
            f.officeName ||
            (inferredId ? (officeNameMap.get(inferredId) ?? null) : null),
          employeeNames: name ? [name] : [],
        };
      }

      if (f.officeId) return f;

      if (inferredId) {
        changed = true;
        return {
          ...f,
          officeId: inferredId,
          officeName: officeNameMap.get(inferredId) ?? null,
        };
      }

      console.warn(
        `  [${duty.month}] freeEmployees officeId를 추론할 수 없음, 건너뜀`
      );
      return f;
    });

    if (changed) {
      await sql`
        UPDATE duties
        SET assignments = ${JSON.stringify(newAssignments)}::jsonb,
            free_employees = ${JSON.stringify(newFreeEmployees)}::jsonb
        WHERE id = ${duty.id}
      `;
      updatedCount++;
      console.log(`  [${duty.month}] 업데이트 완료`);
    } else {
      console.log(`  [${duty.month}] 변경 없음 (이미 officeId 있음)`);
    }
  }

  console.log(`\n완료: ${updatedCount}/${duties.length}개 기록 업데이트됨`);
}

main().catch(console.error);
