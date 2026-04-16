import { NextResponse } from "next/server";
import {
  updateDutyItem,
  deleteDutyItem,
} from "@/lib/db/repositories/duty-items";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, requiredCount, officeId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "항목명을 입력해주세요" }, { status: 400 });
  }

  const updated = await updateDutyItem(id, {
    name: name.trim(),
    requiredCount: Math.max(1, Number(requiredCount) || 1),
    officeId,
  });

  if (!updated) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const removed = await deleteDutyItem(id);

  if (!removed) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
