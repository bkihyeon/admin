import { NextResponse } from "next/server";
import { readJson, writeJson, generateId } from "@/lib/storage";
import { Employee } from "@/lib/types";

const FILE = "employees.json";

export async function GET() {
  const employees = readJson<Employee[]>(FILE, []);
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }

  const employees = readJson<Employee[]>(FILE, []);
  const newEmployee: Employee = {
    id: generateId(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  employees.push(newEmployee);
  writeJson(FILE, employees);

  return NextResponse.json(newEmployee, { status: 201 });
}
