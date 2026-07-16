import type { DutyWithVersionMeta, MaskedDutyResponse } from "@/lib/types";
import { buildCards } from "./cards";

/**
 * 최신 버전: 진행 중 게임 규칙 그대로 — 미공개 카드의 dutyItemName 숨김,
 * allFlipped여야 freeEmployee 노출. revealState 길이 불일치는 corruption으로 throw.
 *
 * 대체된(superseded) 버전: 게임이 이미 끝난 역사 기록이므로 전체 공개.
 * 길이 가드는 flip 무결성 장치라 여기선 우회한다 (탐색이 500으로 깨지지 않게).
 */
export function maskDuty({
  duty,
  totalVersions,
  latestVersion,
}: DutyWithVersionMeta): MaskedDutyResponse {
  const cards = buildCards(duty);
  const isLatest = duty.version === latestVersion;

  if (!isLatest) {
    return {
      id: duty.id,
      month: duty.month,
      officeId: duty.officeId,
      version: duty.version,
      totalVersions,
      isLatest,
      cards: cards.map((c, i) => ({
        cardIndex: i,
        employeeName: c.employeeName,
        dutyItemName: c.dutyItemName,
        isFree: c.isFree,
        isFlipped: true,
        flippedAt: duty.revealState[i]?.flippedAt ?? null,
      })),
      freeEmployee: duty.freeEmployee,
      allFlipped: true,
      createdAt: duty.createdAt,
    };
  }

  if (duty.revealState.length !== cards.length) {
    console.error("[maskDuty] revealState length mismatch", {
      id: duty.id,
      month: duty.month,
      officeId: duty.officeId,
      revealLen: duty.revealState.length,
      cardsLen: cards.length,
    });
    throw new Error(
      `revealState length mismatch (dutyId=${duty.id}, expected=${cards.length}, got=${duty.revealState.length})`
    );
  }
  const allFlipped =
    duty.revealState.length > 0 && duty.revealState.every((r) => r.isFlipped);
  return {
    id: duty.id,
    month: duty.month,
    officeId: duty.officeId,
    version: duty.version,
    totalVersions,
    isLatest,
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
