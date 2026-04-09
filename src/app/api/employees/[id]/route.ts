import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/storage";
import { Employee } from "@/lib/types";

const FILE = "employees.json";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }

  const employees = readJson<Employee[]>(FILE, []);
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "사원을 찾을 수 없습니다" }, { status: 404 });
  }

  employees[index].name = name.trim();
  writeJson(FILE, employees);

  return NextResponse.json(employees[index]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employees = readJson<Employee[]>(FILE, []);
  const filtered = employees.filter((e) => e.id !== id);

  if (filtered.length === employees.length) {
    return NextResponse.json({ error: "사원을 찾을 수 없습니다" }, { status: 404 });
  }

  writeJson(FILE, filtered);
  return NextResponse.json({ success: true });
}
