import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../client";
import { duties } from "../schema";
import { generateId } from "../id";
import type {
  CleaningDuty,
  DutyAssignment,
  OfficeFreeEmployees,
  RevealState,
} from "@/lib/types";
import { buildCards } from "@/lib/duties/cards";

function toDuty(row: typeof duties.$inferSelect): CleaningDuty {
  return {
    id: row.id,
    month: row.month,
    officeId: row.officeId,
    assignments: row.assignments,
    freeEmployee: row.freeEmployee,
    revealState: row.revealState,
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
  const cards = buildCards({
    assignments: input.assignments,
    freeEmployee: input.freeEmployee,
  });
  const initialRevealState: RevealState[] = cards.map((_, i) => ({
    cardIndex: i,
    isFlipped: false,
    flippedAt: null,
  }));

  const [row] = await db
    .insert(duties)
    .values({
      id: generateId(),
      month: input.month,
      officeId: input.officeId,
      assignments: input.assignments,
      freeEmployee: input.freeEmployee,
      revealState: initialRevealState,
    })
    .onConflictDoUpdate({
      target: [duties.month, duties.officeId],
      set: {
        assignments: input.assignments,
        freeEmployee: input.freeEmployee,
        revealState: initialRevealState,
        createdAt: new Date(),
      },
    })
    .returning();
  return toDuty(row);
}

export type FlipCardResult =
  | { kind: "flipped"; duty: CleaningDuty }
  | { kind: "idempotent"; duty: CleaningDuty }
  | { kind: "invalid-index" }
  | { kind: "no-row" };

export async function flipCard(input: {
  month: string;
  officeId: string;
  cardIndex: number;
}): Promise<FlipCardResult> {
  if (!Number.isInteger(input.cardIndex) || input.cardIndex < 0) {
    return { kind: "invalid-index" };
  }
  const idxStr = String(input.cardIndex);
  const nowIso = new Date().toISOString();
  const result = await db.execute(sql`
    UPDATE duties
    SET reveal_state = jsonb_set(
      jsonb_set(
        reveal_state,
        ARRAY[${idxStr}, 'isFlipped'],
        'true'::jsonb,
        false
      ),
      ARRAY[${idxStr}, 'flippedAt'],
      to_jsonb(${nowIso}::text),
      false
    )
    WHERE month = ${input.month}
      AND office_id = ${input.officeId}
      AND ${input.cardIndex}::int < jsonb_array_length(reveal_state)
      AND ((reveal_state -> ${input.cardIndex}::int ->> 'isFlipped')::boolean IS NOT TRUE)
    RETURNING *
  `);
  if (result.rows.length > 0) {
    const row = result.rows[0] as Record<string, unknown>;
    return {
      kind: "flipped",
      duty: toDuty({
        id: row.id as string,
        month: row.month as string,
        officeId: row.office_id as string | null,
        assignments: row.assignments as DutyAssignment[],
        freeEmployee: row.free_employee as OfficeFreeEmployees | null,
        revealState: row.reveal_state as RevealState[],
        createdAt: new Date(row.created_at as string),
      }),
    };
  }
  // 0 row affected: row 없음 / idx 범위 밖 / 이미 flipped 중 하나. SELECT로 분기.
  const current = await getDutyByMonthAndOffice(input.month, input.officeId);
  if (!current) return { kind: "no-row" };
  if (input.cardIndex >= current.revealState.length)
    return { kind: "invalid-index" };
  return { kind: "idempotent", duty: current };
}
