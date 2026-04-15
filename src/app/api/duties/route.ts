import { NextResponse } from "next/server";
import { assignDuties } from "@/lib/random-assign";
import { listEmployees } from "@/lib/db/repositories/employees";
import { listDutyItems } from "@/lib/db/repositories/duty-items";
import {
  listDuties,
  getDutyByMonth,
  upsertDuty,
} from "@/lib/db/repositories/duties";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (month) {
    const duty = await getDutyByMonth(month);
    return NextResponse.json(duty ? [duty] : []);
  }

  const duties = await listDuties();
  return NextResponse.json(duties);
}

export async function POST(request: Request) {
  const { month } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "월을 지정해주세요" }, { status: 400 });
  }

  const [employees, dutyItems] = await Promise.all([
    listEmployees(),
    listDutyItems(),
  ]);

  if (employees.length === 0) {
    return NextResponse.json({ error: "등록된 사원이 없습니다" }, { status: 400 });
  }
  if (dutyItems.length === 0) {
    return NextResponse.json({ error: "등록된 담당항목이 없습니다" }, { status: 400 });
  }

  const totalRequired = dutyItems.reduce((sum, item) => sum + item.requiredCount, 0);
  const assignments = assignDuties(employees, dutyItems);

  const assignedIds = new Set(assignments.flatMap((a) => a.assignedEmployeeIds));
  const freeEmployeeNames = employees
    .filter((e) => !assignedIds.has(e.id))
    .map((e) => e.name);

  const duty = await upsertDuty({ month, assignments, freeEmployeeNames });

  return NextResponse.json(
    {
      duty,
      warning:
        totalRequired > employees.length
          ? `담당 총 인원(${totalRequired}명)이 사원 수(${employees.length}명)보다 많아 일부 사원이 중복 배정되었습니다.`
          : null,
    },
    { status: 201 }
  );
}
