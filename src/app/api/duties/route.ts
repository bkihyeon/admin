import { NextResponse } from "next/server";
import { assignDutiesForOffice } from "@/lib/random-assign";
import { listEmployeesByOffice } from "@/lib/db/repositories/employees";
import { listDutyItemsByOffice } from "@/lib/db/repositories/duty-items";
import { getOfficeById } from "@/lib/db/repositories/offices";
import {
  listDuties,
  getDutyByMonth,
  mergeDutyForOffice,
} from "@/lib/db/repositories/duties";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const officeId = searchParams.get("officeId");

  if (month) {
    const duty = await getDutyByMonth(month);
    if (!duty) return NextResponse.json([]);

    if (officeId) {
      const filtered = {
        ...duty,
        assignments: duty.assignments.filter((a) => a.officeId === officeId),
        freeEmployees: duty.freeEmployees.filter((f) => f.officeId === officeId),
      };
      return NextResponse.json([filtered]);
    }

    return NextResponse.json([duty]);
  }

  const duties = await listDuties();

  if (officeId) {
    const filtered = duties.map((d) => ({
      ...d,
      assignments: d.assignments.filter((a) => a.officeId === officeId),
      freeEmployees: d.freeEmployees.filter((f) => f.officeId === officeId),
    }));
    return NextResponse.json(filtered);
  }

  return NextResponse.json(duties);
}

export async function POST(request: Request) {
  const { month, officeId } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "월을 지정해주세요" }, { status: 400 });
  }
  if (!officeId) {
    return NextResponse.json({ error: "사무실을 지정해주세요" }, { status: 400 });
  }

  const [office, officeEmployees, officeItems] = await Promise.all([
    getOfficeById(officeId),
    listEmployeesByOffice(officeId),
    listDutyItemsByOffice(officeId),
  ]);

  if (!office) {
    return NextResponse.json({ error: "사무실을 찾을 수 없습니다" }, { status: 404 });
  }

  const officeName = office.name;

  if (officeEmployees.length === 0) {
    return NextResponse.json({ error: `${officeName}에 소속된 사원이 없습니다` }, { status: 400 });
  }
  if (officeItems.length === 0) {
    return NextResponse.json({ error: `${officeName}에 등록된 담당항목이 없습니다` }, { status: 400 });
  }

  const { assignments: newAssignments, freeEmployees: newFree } =
    assignDutiesForOffice(officeEmployees, officeItems, officeId, officeName);

  const duty = await mergeDutyForOffice({
    month,
    officeId,
    assignments: newAssignments,
    freeEmployees: newFree,
  });

  const reqCount = officeItems.reduce((sum, d) => sum + d.requiredCount, 0);
  const warning =
    reqCount > officeEmployees.length
      ? `${officeName}: 필요 인원(${reqCount}명) > 사원 수(${officeEmployees.length}명), 일부 중복 배정`
      : null;

  return NextResponse.json({ duty, warning }, { status: 201 });
}
