import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { MaskedDutyResponse } from "@/lib/types";

/**
 * 특정 버전 조회. version이 null이면 비활성 (최신은 폴링하는 duties 키가 담당).
 * superseded 응답은 불변이라 영구 캐시하되, 아직 최신(진행 중 게임)인 응답은
 * 이후 상태가 바뀌므로 캐시하지 않는다.
 */
export function useDutyVersion(
  officeId: string | null,
  month: string,
  version: number | null
) {
  return useQuery<MaskedDutyResponse>({
    queryKey: queryKeys.dutyVersion(officeId, month, version ?? 0),
    queryFn: async () => {
      const res = await fetch(
        `/api/duties?month=${month}&officeId=${officeId}&version=${version}`
      );
      if (!res.ok) throw new Error("버전을 불러오지 못했습니다");
      return (await res.json()) as MaskedDutyResponse;
    },
    enabled: !!officeId && version !== null,
    staleTime: (q) => (q.state.data && !q.state.data.isLatest ? Infinity : 0),
  });
}
