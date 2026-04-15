import { eq } from "drizzle-orm";
import { db } from "../client";
import { dutyItems } from "../schema";
import { generateId } from "../id";
import type { DutyItem } from "@/lib/types";

export async function listDutyItems(): Promise<DutyItem[]> {
  return db.select().from(dutyItems);
}

export async function createDutyItem(input: {
  name: string;
  requiredCount: number;
}): Promise<DutyItem> {
  const [row] = await db
    .insert(dutyItems)
    .values({
      id: generateId(),
      name: input.name,
      requiredCount: input.requiredCount,
    })
    .returning();
  return row;
}

export async function updateDutyItem(
  id: string,
  input: { name: string; requiredCount: number }
): Promise<DutyItem | null> {
  const [row] = await db
    .update(dutyItems)
    .set({ name: input.name, requiredCount: input.requiredCount })
    .where(eq(dutyItems.id, id))
    .returning();
  return row ?? null;
}

export async function deleteDutyItem(id: string): Promise<boolean> {
  const rows = await db
    .delete(dutyItems)
    .where(eq(dutyItems.id, id))
    .returning({ id: dutyItems.id });
  return rows.length > 0;
}
