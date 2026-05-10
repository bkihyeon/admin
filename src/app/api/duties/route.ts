import { NextResponse } from "next/server";
import {
  getDutyByMonthAndOffice,
  listDutiesByOffice,
  upsertDuty,
} from "@/lib/db/repositories/duties";
import { listDutyItemsByOffice } from "@/lib/db/repositories/duty-items";
import { listEmployeesByOffice } from "@/lib/db/repositories/employees";
import { getOfficeById } from "@/lib/db/repositories/offices";
import { maskDuty } from "@/lib/duties/mask";
import { assignDutiesForOffice } from "@/lib/random-assign";
import type { MaskedDutyResponse } from "@/lib/types";

type GetResponse =
  | MaskedDutyResponse
  | MaskedDutyResponse[]
  | null
  | { error: string };

export async function GET(
  request: Request
): Promise<NextResponse<GetResponse>> {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const officeId = searchParams.get("officeId");

  if (!officeId) {
    return NextResponse.json(
      { error: "사무실을 지정해주세요" },
      { status: 400 }
    );
  }

  if (month) {
    const duty = await getDutyByMonthAndOffice(month, officeId);
    if (!duty) return NextResponse.json(null);
    try {
      return NextResponse.json(maskDuty(duty));
    } catch {
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
  }

  const list = await listDutiesByOffice(officeId);
  try {
    return NextResponse.json(list.map(maskDuty));
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

type PostResponse =
  | { duty: MaskedDutyResponse; warning: string | null }
  | { error: string };

export async function POST(
  request: Request
): Promise<NextResponse<PostResponse>> {
  const { month, officeId } = await request.json();
  if (!month) {
    return NextResponse.json({ error: "월을 지정해주세요" }, { status: 400 });
  }
  if (!officeId) {
    return NextResponse.json(
      { error: "사무실을 지정해주세요" },
      { status: 400 }
    );
  }

  const [office, officeEmployees, officeItems] = await Promise.all([
    getOfficeById(officeId),
    listEmployeesByOffice(officeId),
    listDutyItemsByOffice(officeId),
  ]);

  if (!office) {
    return NextResponse.json(
      { error: "사무실을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  const officeName = office.name;

  if (officeEmployees.length === 0) {
    return NextResponse.json(
      { error: `${officeName}에 소속된 사원이 없습니다` },
      { status: 400 }
    );
  }
  if (officeItems.length === 0) {
    return NextResponse.json(
      { error: `${officeName}에 등록된 담당항목이 없습니다` },
      { status: 400 }
    );
  }

  const { assignments, freeEmployee } = assignDutiesForOffice(
    officeEmployees,
    officeItems,
    officeId,
    officeName
  );

  const duty = await upsertDuty({ month, officeId, assignments, freeEmployee });

  const reqCount = officeItems.reduce((sum, d) => sum + d.requiredCount, 0);
  const warning =
    reqCount > officeEmployees.length
      ? `${officeName}: 필요 인원(${reqCount}명) > 사원 수(${officeEmployees.length}명), 일부 중복 배정`
      : null;

  try {
    return NextResponse.json(
      { duty: maskDuty(duty), warning },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
