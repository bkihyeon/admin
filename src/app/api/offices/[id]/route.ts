import { NextResponse } from "next/server";
import {
  updateOffice,
  deleteOffice,
} from "@/lib/db/repositories/offices";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json(
      { error: "사무실 이름을 입력해주세요" },
      { status: 400 }
    );
  }
  const office = await updateOffice(id, name.trim());
  if (!office) {
    return NextResponse.json(
      { error: "사무실을 찾을 수 없습니다" },
      { status: 404 }
    );
  }
  return NextResponse.json(office);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteOffice(id);
  if (!deleted) {
    return NextResponse.json(
      { error: "사무실을 찾을 수 없습니다" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
