import { NextResponse } from "next/server";
import {
  listDutyItems,
  listDutyItemsByOffice,
  createDutyItem,
} from "@/lib/db/repositories/duty-items";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const officeId = searchParams.get("officeId");

  const items = officeId
    ? await listDutyItemsByOffice(officeId)
    : await listDutyItems();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { name, requiredCount, officeId } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "항목명을 입력해주세요" }, { status: 400 });
  }

  const newItem = await createDutyItem({
    name: name.trim(),
    requiredCount: Math.max(1, Number(requiredCount) || 1),
    officeId,
  });

  return NextResponse.json(newItem, { status: 201 });
}
