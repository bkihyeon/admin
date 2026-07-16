import { Clock } from "lucide-react";
import AssignmentGrid from "@/components/AssignmentGrid";
import type { MaskedDutyResponse } from "@/lib/types";

/**
 * 한 버전의 배정 내용을 read-only로 렌더.
 * superseded 버전은 서버가 전체 공개해서 내려주고,
 * 최신인데 미완료(진행 중 게임)면 내용 대신 진행 상태만 알린다.
 */
export default function DutyVersionView({
  duty,
}: {
  duty: MaskedDutyResponse;
}) {
  if (duty.isLatest && !duty.allFlipped) {
    const flippedCount = duty.cards.filter((c) => c.isFlipped).length;
    return (
      <p className="text-sm text-text-tertiary">
        진행 중인 뽑기입니다 ({flippedCount}/{duty.cards.length} 공개)
      </p>
    );
  }

  return (
    <>
      <AssignmentGrid cards={duty.cards} freeEmployee={duty.freeEmployee} />
      <p className="mt-4 text-xs text-text-tertiary flex items-center gap-1.5">
        <Clock size={14} />
        배정일시: {new Date(duty.createdAt).toLocaleString("ko-KR")}
      </p>
    </>
  );
}
