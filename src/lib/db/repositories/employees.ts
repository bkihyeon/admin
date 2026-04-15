import { eq } from "drizzle-orm";
import { db } from "../client";
import { employees } from "../schema";
import { generateId } from "../id";
import type { Employee } from "@/lib/types";

function toEmployee(row: typeof employees.$inferSelect): Employee {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listEmployees(): Promise<Employee[]> {
  const rows = await db.select().from(employees).orderBy(employees.createdAt);
  return rows.map(toEmployee);
}

export async function createEmployee(name: string): Promise<Employee> {
  const [row] = await db
    .insert(employees)
    .values({ id: generateId(), name })
    .returning();
  return toEmployee(row);
}

export async function updateEmployee(
  id: string,
  name: string
): Promise<Employee | null> {
  const [row] = await db
    .update(employees)
    .set({ name })
    .where(eq(employees.id, id))
    .returning();
  return row ? toEmployee(row) : null;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const rows = await db
    .delete(employees)
    .where(eq(employees.id, id))
    .returning({ id: employees.id });
  return rows.length > 0;
}
