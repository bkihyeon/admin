import { NextResponse } from "next/server";
import {
  createEmployee,
  listEmployees,
  listEmployeesByOffice,
} from "@/lib/db/repositories/employees";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeId = searchParams.get("officeId");

  const employees = officeId
    ? await listEmployeesByOffice(officeId)
    : await listEmployees();
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const { name, officeId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }

  const newEmployee = await createEmployee({ name: name.trim(), officeId });
  return NextResponse.json(newEmployee, { status: 201 });
}
