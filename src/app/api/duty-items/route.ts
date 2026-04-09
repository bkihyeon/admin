import { NextResponse } from "next/server";
import { readJson, writeJson, generateId } from "@/lib/storage";
import { DutyItem } from "@/lib/types";

const FILE = "duty-items.json";

export async function GET() {
  const items = readJson<DutyItem[]>(FILE, []);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { name, requiredCount } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "항목명을 입력해주세요" }, { status: 400 });
  }

  const items = readJson<DutyItem[]>(FILE, []);
  const newItem: DutyItem = {
    id: generateId(),
    name: name.trim(),
    requiredCount: Math.max(1, Number(requiredCount) || 1),
  };
  items.push(newItem);
  writeJson(FILE, items);

  return NextResponse.json(newItem, { status: 201 });
}
