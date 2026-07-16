"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DutyVersionNav from "@/components/DutyVersionNav";
import DutyVersionView from "@/components/DutyVersionView";
import HistorySkeleton from "@/components/skeletons/HistorySkeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useOffice } from "@/contexts/OfficeContext";
import { useDelayedPending } from "@/lib/hooks/useDelayedPending";
import { useDutyVersion } from "@/lib/hooks/useDutyVersion";
import { queryKeys } from "@/lib/query-keys";
import type { DutiesPage, MaskedDutyResponse } from "@/lib/types";

const PAGE_SIZE = 6;

export default function HistoryPage() {
  const { selectedOfficeId } = useOffice();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery<DutiesPage>({
      queryKey: queryKeys.dutiesPage(selectedOfficeId),
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({
          officeId: selectedOfficeId ?? "",
          limit: String(PAGE_SIZE),
        });
        if (typeof pageParam === "string" && pageParam) {
          params.set("before", pageParam);
        }
        const res = await fetch(`/api/duties?${params.toString()}`);
        if (!res.ok) throw new Error("이력을 불러오지 못했습니다");
        return (await res.json()) as DutiesPage;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
      enabled: !!selectedOfficeId,
      placeholderData: keepPreviousData,
    });

  const showSkeleton = useDelayedPending(isPending);
  const duties = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  // sentinel이 200px rootMargin 안에 머무는 동안 연쇄 fetch가 발생하지 않도록,
  // 최신 fetching 상태를 ref로 들고 observer 콜백에서 매번 가드.
  const fetchingRef = useRef(false);
  fetchingRef.current = isFetchingNextPage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <BlurFade delay={0}>
        <PageHeader title="이력 조회" />
      </BlurFade>

      {showSkeleton ? (
        <HistorySkeleton />
      ) : isPending ? null : duties.length === 0 ? (
        <BlurFade delay={0.1}>
          <Card>
            <EmptyState
              icon={Clock}
              title="배정 이력이 없습니다"
              description="청소 배정 페이지에서 랜덤 뽑기를 먼저 진행해주세요."
              actionLabel="청소 배정으로 이동"
              actionHref="/duties"
            />
          </Card>
        </BlurFade>
      ) : (
        <div className="space-y-6">
          {duties.map((duty, idx) => (
            <BlurFade key={duty.id} delay={Math.min(idx * 0.05, 0.3)}>
              <DutyFeedItem duty={duty} officeId={selectedOfficeId} />
            </BlurFade>
          ))}

          <div ref={sentinelRef} className="h-1" aria-hidden />

          {isFetchingNextPage && (
            <div className="py-4 text-center text-sm text-text-tertiary">
              불러오는 중…
            </div>
          )}

          {!hasNextPage && duties.length > 0 && (
            <div className="py-4 text-center text-xs text-text-tertiary">
              더 이상 이력이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DutyFeedItem({
  duty,
  officeId,
}: {
  duty: MaskedDutyResponse;
  officeId: string | null;
}) {
  // 피드 항목(duty)은 그 월의 "최신 완료 버전". null이면 그대로, 숫자면 해당 버전 조회
  const [viewedVersion, setViewedVersion] = useState<number | null>(null);
  const { data: versionData } = useDutyVersion(
    officeId,
    duty.month,
    viewedVersion
  );
  const displayed = viewedVersion === null ? duty : versionData;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          {duty.month} 청소 배정
        </h3>
        {duty.totalVersions > 1 && (
          <DutyVersionNav
            version={viewedVersion ?? duty.version}
            totalVersions={duty.totalVersions}
            onChange={(v) => setViewedVersion(v === duty.version ? null : v)}
          />
        )}
      </div>

      {displayed ? <DutyVersionView duty={displayed} /> : null}
    </Card>
  );
}
