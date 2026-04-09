import { NextResponse } from "next/server";
import { readJson, writeJson, generateId } from "@/lib/storage";
import { Employee, DutyItem, CleaningDuty } from "@/lib/types";
import { assignDuties } from "@/lib/random-assign";

const DUTIES_FILE = "duties.json";
const EMPLOYEES_FILE = "employees.json";
const DUTY_ITEMS_FILE = "duty-items.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const duties = readJson<CleaningDuty[]>(DUTIES_FILE, []);

  if (month) {
    const filtered = duties.filter((d) => d.month === month);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(duties);
}

export async function POST(request: Request) {
  const { month } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "월을 지정해주세요" }, { status: 400 });
  }

  const employees = readJson<Employee[]>(EMPLOYEES_FILE, []);
  const dutyItems = readJson<DutyItem[]>(DUTY_ITEMS_FILE, []);

  if (employees.length === 0) {
    return NextResponse.json({ error: "등록된 사원이 없습니다" }, { status: 400 });
  }
  if (dutyItems.length === 0) {
    return NextResponse.json({ error: "등록된 담당항목이 없습니다" }, { status: 400 });
  }

  const totalRequired = dutyItems.reduce((sum, item) => sum + item.requiredCount, 0);
  const assignments = assignDuties(employees, dutyItems);

  const duties = readJson<CleaningDuty[]>(DUTIES_FILE, []);

  // 같은 월 기존 배정이 있으면 교체
  const existingIndex = duties.findIndex((d) => d.month === month);
  const newDuty: CleaningDuty = {
    id: generateId(),
    month,
    assignments,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    duties[existingIndex] = newDuty;
  } else {
    duties.push(newDuty);
  }

  // 월 기준 정렬
  duties.sort((a, b) => b.month.localeCompare(a.month));
  writeJson(DUTIES_FILE, duties);

  return NextResponse.json({
    duty: newDuty,
    warning:
      totalRequired > employees.length
        ? `담당 총 인원(${totalRequired}명)이 사원 수(${employees.length}명)보다 많아 일부 사원이 중복 배정되었습니다.`
        : null,
  }, { status: 201 });
}
