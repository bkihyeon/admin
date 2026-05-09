import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { duties } from "../schema";
import { generateId } from "../id";
import type { CleaningDuty, DutyAssignment, OfficeFreeEmployees } from "@/lib/types";

function toDuty(row: typeof duties.$inferSelect): CleaningDuty {
  return {
    id: row.id,
    month: row.month,
    officeId: row.officeId,
    assignments: row.assignments,
    freeEmployee: row.freeEmployee,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getDutyByMonthAndOffice(
  month: string,
  officeId: string,
): Promise<CleaningDuty | null> {
  const [row] = await db
    .select()
    .from(duties)
    .where(and(eq(duties.month, month), eq(duties.officeId, officeId)));
  return row ? toDuty(row) : null;
}

export async function listDutiesByOffice(
  officeId: string,
): Promise<CleaningDuty[]> {
  const rows = await db
    .select()
    .from(duties)
    .where(eq(duties.officeId, officeId))
    .orderBy(desc(duties.month));
  return rows.map(toDuty);
}

export async function upsertDuty(input: {
  month: string;
  officeId: string;
  assignments: DutyAssignment[];
  freeEmployee: OfficeFreeEmployees | null;
}): Promise<CleaningDuty> {
  const [row] = await db
    .insert(duties)
    .values({
      id: generateId(),
      month: input.month,
      officeId: input.officeId,
      assignments: input.assignments,
      freeEmployee: input.freeEmployee,
    })
    .onConflictDoUpdate({
      target: [duties.month, duties.officeId],
      set: {
        assignments: input.assignments,
        freeEmployee: input.freeEmployee,
        createdAt: new Date(),
      },
    })
    .returning();
  return toDuty(row);
}
