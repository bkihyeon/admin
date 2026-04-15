import { NextResponse } from "next/server";
import { generateRecyclingSchedule } from "@/lib/recycling-rotation";
import { listEmployees } from "@/lib/db/repositories/employees";
import {
  getRecyclingState,
  updateRecyclingState,
} from "@/lib/db/repositories/recycling";

export async function GET() {
  const [state, employees] = await Promise.all([
    getRecyclingState(),
    listEmployees(),
  ]);
  return NextResponse.json({ ...state, totalEmployees: employees.length });
}

export async function POST() {
  const employees = await listEmployees();

  if (employees.length === 0) {
    return NextResponse.json({ error: "등록된 사원이 없습니다" }, { status: 400 });
  }

  const currentState = await getRecyclingState();
  const { schedule, nextIndex } = generateRecyclingSchedule(
    employees,
    currentState.currentIndex
  );

  const newState = await updateRecyclingState({
    currentIndex: nextIndex,
    schedule,
  });

  return NextResponse.json(newState, { status: 201 });
}
