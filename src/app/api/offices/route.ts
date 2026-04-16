import { NextResponse } from "next/server";
import {
  listOffices,
  createOffice,
} from "@/lib/db/repositories/offices";

export async function GET() {
  const offices = await listOffices();
  return NextResponse.json(offices);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json(
      { error: "사무실 이름을 입력해주세요" },
      { status: 400 }
    );
  }
  const office = await createOffice(name.trim());
  return NextResponse.json(office, { status: 201 });
}
