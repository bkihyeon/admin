import type { CleaningDuty, MaskedDutyResponse } from "@/lib/types";
import { buildCards } from "./cards";

export function maskDuty(duty: CleaningDuty): MaskedDutyResponse {
  const cards = buildCards(duty);
  if (duty.revealState.length !== cards.length) {
    console.error("[maskDuty] revealState length mismatch", {
      id: duty.id,
      month: duty.month,
      officeId: duty.officeId,
      revealLen: duty.revealState.length,
      cardsLen: cards.length,
    });
    throw new Error(
      `revealState length mismatch (dutyId=${duty.id}, expected=${cards.length}, got=${duty.revealState.length})`,
    );
  }
  const allFlipped =
    duty.revealState.length > 0 && duty.revealState.every((r) => r.isFlipped);
  return {
    id: duty.id,
    month: duty.month,
    officeId: duty.officeId,
    cards: cards.map((c, i) => {
      const r = duty.revealState[i];
      return {
        cardIndex: i,
        employeeName: c.employeeName,
        dutyItemName: r.isFlipped ? c.dutyItemName : null,
        isFree: c.isFree,
        isFlipped: r.isFlipped,
        flippedAt: r.flippedAt,
      };
    }),
    freeEmployee: allFlipped ? duty.freeEmployee : null,
    allFlipped,
    createdAt: duty.createdAt,
  };
}
