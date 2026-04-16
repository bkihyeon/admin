import { NextResponse } from "next/server";
import { assignDuties, assignDutiesForOffice } from "@/lib/random-assign";
import { listEmployees } from "@/lib/db/repositories/employees";
import { listDutyItems } from "@/lib/db/repositories/duty-items";
import { listOffices } from "@/lib/db/repositories/offices";
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
  const { month, officeId } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "월을 지정해주세요" }, { status: 400 });
  }

  const [employees, dutyItems, offices] = await Promise.all([
    listEmployees(),
    listDutyItems(),
    listOffices(),
  ]);

  if (employees.length === 0) {
    return NextResponse.json({ error: "등록된 사원이 없습니다" }, { status: 400 });
  }
  if (dutyItems.length === 0) {
    return NextResponse.json({ error: "등록된 담당항목이 없습니다" }, { status: 400 });
  }

  const officeMap = new Map(offices.map((o) => [o.id, o.name]));

  // 사무실별 뽑기
  if (officeId) {
    const officeName = officeMap.get(officeId);
    if (!officeName) {
      return NextResponse.json({ error: "사무실을 찾을 수 없습니다" }, { status: 404 });
    }

    const officeEmployees = employees.filter((e) => e.officeId === officeId);
    const officeItems = dutyItems.filter((d) => d.officeId === officeId);

    if (officeEmployees.length === 0) {
      return NextResponse.json({ error: `${officeName}에 소속된 사원이 없습니다` }, { status: 400 });
    }
    if (officeItems.length === 0) {
      return NextResponse.json({ error: `${officeName}에 등록된 담당항목이 없습니다` }, { status: 400 });
    }

    const { assignments: newAssignments, freeEmployees: newFree } =
      assignDutiesForOffice(employees, dutyItems, officeId, officeName);

    // 기존 배정에서 해당 사무실 것만 교체, 나머지 유지
    const existing = await getDutyByMonth(month);
    const otherAssignments = existing?.assignments.filter((a) => a.officeId !== officeId) ?? [];
    const otherFree = existing?.freeEmployees.filter((f) => f.officeId !== officeId) ?? [];

    const mergedAssignments = [...otherAssignments, ...newAssignments];
    const mergedFree = [...otherFree, ...(newFree ? [newFree] : [])];

    const duty = await upsertDuty({ month, assignments: mergedAssignments, freeEmployees: mergedFree });

    const reqCount = officeItems.reduce((sum, d) => sum + d.requiredCount, 0);
    const warning =
      reqCount > officeEmployees.length
        ? `${officeName}: 필요 인원(${reqCount}명) > 사원 수(${officeEmployees.length}명), 일부 중복 배정`
        : null;

    return NextResponse.json({ duty, warning }, { status: 201 });
  }

  // 전체 뽑기
  const { assignments, freeEmployees } = assignDuties(employees, dutyItems, offices);
  const duty = await upsertDuty({ month, assignments, freeEmployees });

  const warnings: string[] = [];
  const officeIds = new Set<string | null>();
  for (const e of employees) officeIds.add(e.officeId);
  for (const d of dutyItems) officeIds.add(d.officeId);

  for (const oid of officeIds) {
    const empCount = employees.filter((e) => e.officeId === oid).length;
    const reqCount = dutyItems
      .filter((d) => d.officeId === oid)
      .reduce((sum, d) => sum + d.requiredCount, 0);
    if (reqCount > empCount && empCount > 0) {
      const name = oid ? officeMap.get(oid) ?? "미분류" : "미분류";
      warnings.push(`${name}: 필요 인원(${reqCount}명) > 사원 수(${empCount}명)`);
    }
  }

  return NextResponse.json(
    {
      duty,
      warning:
        warnings.length > 0
          ? `일부 사무실에서 사원이 중복 배정되었습니다. ${warnings.join(", ")}`
          : null,
    },
    { status: 201 }
  );
}
