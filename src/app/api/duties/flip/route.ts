import { NextResponse } from "next/server";
import { flipCard } from "@/lib/db/repositories/duties";
import { maskDuty } from "@/lib/duties/mask";
import type { MaskedDutyResponse } from "@/lib/types";

type FlipResponse = MaskedDutyResponse | { error: string };

export async function POST(
  request: Request
): Promise<NextResponse<FlipResponse>> {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.month !== "string" ||
    typeof body.officeId !== "string" ||
    !Number.isInteger(body.cardIndex)
  ) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const result = await flipCard({
    month: body.month,
    officeId: body.officeId,
    cardIndex: body.cardIndex,
  });

  switch (result.kind) {
    case "no-row":
      return NextResponse.json({ error: "duty not found" }, { status: 404 });
    case "invalid-index":
      return NextResponse.json({ error: "invalid cardIndex" }, { status: 404 });
    case "flipped":
    case "idempotent":
      try {
        return NextResponse.json(maskDuty(result.duty));
      } catch {
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
  }
}
