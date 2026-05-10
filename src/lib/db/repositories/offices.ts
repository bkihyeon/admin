import { eq } from "drizzle-orm";
import type { Office } from "@/lib/types";
import { db } from "../client";
import { generateId } from "../id";
import { offices } from "../schema";

function toOffice(row: typeof offices.$inferSelect): Office {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listOffices(): Promise<Office[]> {
  const rows = await db.select().from(offices).orderBy(offices.createdAt);
  return rows.map(toOffice);
}

export async function getOfficeById(id: string): Promise<Office | null> {
  const [row] = await db.select().from(offices).where(eq(offices.id, id));
  return row ? toOffice(row) : null;
}

export async function createOffice(name: string): Promise<Office> {
  const [row] = await db
    .insert(offices)
    .values({ id: generateId(), name })
    .returning();
  return toOffice(row);
}

export async function updateOffice(
  id: string,
  name: string
): Promise<Office | null> {
  const [row] = await db
    .update(offices)
    .set({ name })
    .where(eq(offices.id, id))
    .returning();
  return row ? toOffice(row) : null;
}

export async function deleteOffice(id: string): Promise<boolean> {
  const rows = await db
    .delete(offices)
    .where(eq(offices.id, id))
    .returning({ id: offices.id });
  return rows.length > 0;
}
