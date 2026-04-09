import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/storage";
import { Employee, RecyclingState } from "@/lib/types";
import { generateRecyclingSchedule } from "@/lib/recycling-rotation";

const RECYCLING_FILE = "recycling.json";
const EMPLOYEES_FILE = "employees.json";

const DEFAULT_STATE: RecyclingState = {
  currentIndex: 0,
  schedule: [],
  updatedAt: "",
};

export async function GET() {
  const state = readJson<RecyclingState>(RECYCLING_FILE, DEFAULT_STATE);
  const employees = readJson<Employee[]>(EMPLOYEES_FILE, []);
  return NextResponse.json({ ...state, totalEmployees: employees.length });
}

export async function POST() {
  const employees = readJson<Employee[]>(EMPLOYEES_FILE, []);

  if (employees.length === 0) {
    return NextResponse.json({ error: "등록된 사원이 없습니다" }, { status: 400 });
  }

  const currentState = readJson<RecyclingState>(RECYCLING_FILE, DEFAULT_STATE);
  const { schedule, nextIndex } = generateRecyclingSchedule(
    employees,
    currentState.currentIndex
  );

  const newState: RecyclingState = {
    currentIndex: nextIndex,
    schedule,
    updatedAt: new Date().toISOString(),
  };

  writeJson(RECYCLING_FILE, newState);

  return NextResponse.json(newState, { status: 201 });
}
