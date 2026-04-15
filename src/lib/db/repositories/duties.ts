import { desc, eq } from "drizzle-orm";
import { db } from "../client";
import { duties } from "../schema";
import { generateId } from "../id";
import type { CleaningDuty, DutyAssignment } from "@/lib/types";

function toDuty(row: typeof duties.$inferSelect): CleaningDuty {
  return {
    id: row.id,
    month: row.month,
    assignments: row.assignments,
    freeEmployeeNames: row.freeEmployeeNames,
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
  freeEmployeeNames: string[];
}): Promise<CleaningDuty> {
  const [row] = await db
    .insert(duties)
    .values({
      id: generateId(),
      month: input.month,
      assignments: input.assignments,
      freeEmployeeNames: input.freeEmployeeNames,
    })
    .onConflictDoUpdate({
      target: duties.month,
      set: {
        assignments: input.assignments,
        freeEmployeeNames: input.freeEmployeeNames,
        createdAt: new Date(),
      },
    })
    .returning();
  return toDuty(row);
}
