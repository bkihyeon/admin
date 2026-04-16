import { NextResponse } from "next/server";
import { updateEmployee, deleteEmployee } from "@/lib/db/repositories/employees";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, officeId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }

  const updated = await updateEmployee(id, { name: name.trim(), officeId });
  if (!updated) {
    return NextResponse.json({ error: "사원을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const removed = await deleteEmployee(id);

  if (!removed) {
    return NextResponse.json({ error: "사원을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
