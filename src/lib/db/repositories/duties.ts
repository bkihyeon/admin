import { desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { duties } from "../schema";
import { generateId } from "../id";
import type { CleaningDuty, DutyAssignment, OfficeFreeEmployees } from "@/lib/types";

function normalizeFreeEmployees(
  raw: OfficeFreeEmployees[]
): OfficeFreeEmployees[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  // 레거시 데이터: string[] → OfficeFreeEmployees[] 변환
  if (typeof raw[0] === "string") {
    return [
      {
        officeId: null,
        officeName: null,
        employeeNames: raw as unknown as string[],
      },
    ];
  }
  return raw;
}

function toDuty(row: typeof duties.$inferSelect): CleaningDuty {
  return {
    id: row.id,
    month: row.month,
    assignments: row.assignments,
    freeEmployees: normalizeFreeEmployees(row.freeEmployees),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listDuties(): Promise<CleaningDuty[]> {
  const rows = await db.select().from(duties).orderBy(desc(duties.month));
  return rows.map(toDuty);
}

export async function getDutyByMonth(
  month: string
): Promise<CleaningDuty | null> {
  const [row] = await db.select().from(duties).where(eq(duties.month, month));
  return row ? toDuty(row) : null;
}

export async function upsertDuty(input: {
  month: string;
  assignments: DutyAssignment[];
  freeEmployees: OfficeFreeEmployees[];
}): Promise<CleaningDuty> {
  const [row] = await db
    .insert(duties)
    .values({
      id: generateId(),
      month: input.month,
      assignments: input.assignments,
      freeEmployees: input.freeEmployees,
    })
    .onConflictDoUpdate({
      target: duties.month,
      set: {
        assignments: input.assignments,
        freeEmployees: input.freeEmployees,
        createdAt: new Date(),
      },
    })
    .returning();
  return toDuty(row);
}

// race 봉쇄용 단일 SQL atomic merge. 두 사무실이 같은 월에 동시 POST해도
// ON CONFLICT (month) DO UPDATE가 row 단위 락으로 직렬화되어 한쪽 결과가
// 사라지는 race가 사라진다. 기존 row의 같은 officeId 항목만 제거 후 새 항목 concat.
// created_at = now()는 다른 office 추가가 우리 시각도 갱신하는 의미 왜곡이 있으나
// Phase 1의 (month, office_id) 정규화에서 정상화 예정. Phase 0 목표는 race만.
export async function mergeDutyForOffice(input: {
  month: string;
  officeId: string;
  assignments: DutyAssignment[];
  freeEmployees: OfficeFreeEmployees | null;
}): Promise<CleaningDuty> {
  const newId = generateId();
  const newAssignmentsJson = JSON.stringify(input.assignments);
  const newFreeArray = input.freeEmployees ? [input.freeEmployees] : [];
  const newFreeJson = JSON.stringify(newFreeArray);

  const result = await db.execute(sql`
    INSERT INTO duties (id, month, assignments, free_employees, created_at)
    VALUES (${newId}, ${input.month}, ${newAssignmentsJson}::jsonb, ${newFreeJson}::jsonb, now())
    ON CONFLICT (month) DO UPDATE
    SET
      assignments = COALESCE(
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(duties.assignments) elem
          WHERE elem->>'officeId' IS DISTINCT FROM ${input.officeId}
        ),
        '[]'::jsonb
      ) || EXCLUDED.assignments,
      free_employees = COALESCE(
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(duties.free_employees) elem
          WHERE elem->>'officeId' IS DISTINCT FROM ${input.officeId}
        ),
        '[]'::jsonb
      ) || EXCLUDED.free_employees,
      created_at = now()
    RETURNING id, month, assignments, free_employees, created_at
  `);

  type Row = {
    id: string;
    month: string;
    assignments: DutyAssignment[];
    free_employees: OfficeFreeEmployees[];
    created_at: Date | string;
  };
  const rows = (result as unknown as { rows?: Row[] }).rows
    ?? (result as unknown as Row[]);
  const row = rows[0];

  const ownAssignments = row.assignments.filter(
    (a) => a.officeId === input.officeId,
  );
  const ownFree = row.free_employees.filter(
    (f) => f.officeId === input.officeId,
  );

  return {
    id: row.id,
    month: row.month,
    assignments: ownAssignments,
    freeEmployees: normalizeFreeEmployees(ownFree),
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString(),
  };
}
