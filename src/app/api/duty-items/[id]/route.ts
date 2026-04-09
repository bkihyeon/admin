import { NextResponse } from "next/server";
import { readJson, writeJson } from "@/lib/storage";
import { DutyItem } from "@/lib/types";

const FILE = "duty-items.json";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, requiredCount } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "항목명을 입력해주세요" }, { status: 400 });
  }

  const items = readJson<DutyItem[]>(FILE, []);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
  }

  items[index].name = name.trim();
  items[index].requiredCount = Math.max(1, Number(requiredCount) || 1);
  writeJson(FILE, items);

  return NextResponse.json(items[index]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = readJson<DutyItem[]>(FILE, []);
  const filtered = items.filter((i) => i.id !== id);

  if (filtered.length === items.length) {
    return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
  }

  writeJson(FILE, filtered);
  return NextResponse.json({ success: true });
}
