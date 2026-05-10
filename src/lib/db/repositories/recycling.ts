import { eq } from "drizzle-orm";
import type { RecyclingState, RecyclingWeek } from "@/lib/types";
import { db } from "../client";
import { recyclingState } from "../schema";

const SINGLETON_ID = 1;

const DEFAULT_STATE: RecyclingState = {
  currentIndex: 0,
  schedule: [],
  updatedAt: "",
};

export async function getRecyclingState(): Promise<RecyclingState> {
  const [row] = await db
    .select()
    .from(recyclingState)
    .where(eq(recyclingState.id, SINGLETON_ID));

  if (!row) return DEFAULT_STATE;

  return {
    currentIndex: row.currentIndex,
    schedule: row.schedule,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateRecyclingState(input: {
  currentIndex: number;
  schedule: RecyclingWeek[];
}): Promise<RecyclingState> {
  const now = new Date();
  const [row] = await db
    .insert(recyclingState)
    .values({
      id: SINGLETON_ID,
      currentIndex: input.currentIndex,
      schedule: input.schedule,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: recyclingState.id,
      set: {
        currentIndex: input.currentIndex,
        schedule: input.schedule,
        updatedAt: now,
      },
    })
    .returning();

  return {
    currentIndex: row.currentIndex,
    schedule: row.schedule,
    updatedAt: row.updatedAt.toISOString(),
  };
}
