"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import HistorySkeleton from "@/components/skeletons/HistorySkeleton";
import Badge from "@/components/ui/Badge";
import { BlurFade } from "@/components/ui/blur-fade";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useOffice } from "@/contexts/OfficeContext";
import { groupCardsByItem } from "@/lib/duties/cards";
import { useDelayedPending } from "@/lib/hooks/useDelayedPending";
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
              <DutyFeedItem duty={duty} />
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

function DutyFeedItem({ duty }: { duty: MaskedDutyResponse }) {
  const groups = groupCardsByItem(duty.cards);
  const dutyItemGroups = groups.filter((g) => !g.isFree);
  const freeEmployeeNames = duty.freeEmployee?.employeeNames ?? [];

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-text-primary mb-4">
        {duty.month} 청소 배정
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dutyItemGroups.map((g) => (
          <div
            key={g.name}
            className="rounded-lg bg-surface-secondary border border-border-light p-4"
          >
            <div className="text-sm font-semibold text-text-primary mb-2">
              {g.name}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.employees.map((name) => (
                <Badge key={name} variant="neutral">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {freeEmployeeNames.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-tertiary font-medium">프리:</span>
          {freeEmployeeNames.map((name) => (
            <Badge key={name} variant="neutral">
              {name}
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-text-tertiary flex items-center gap-1.5">
        <Clock size={14} />
        배정일시: {new Date(duty.createdAt).toLocaleString("ko-KR")}
      </p>
    </Card>
  );
}
