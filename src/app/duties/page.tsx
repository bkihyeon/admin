"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Clock, Dices, LayoutGrid, Loader2 } from "lucide-react";
import { useState } from "react";
import CardFlipModal from "@/components/CardFlipModal";
import DutiesSkeleton from "@/components/skeletons/DutiesSkeleton";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BlurFade } from "@/components/ui/blur-fade";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useOffice } from "@/contexts/OfficeContext";
import { groupCardsByItem } from "@/lib/duties/cards";
import { useDelayedPending } from "@/lib/hooks/useDelayedPending";
import { queryKeys } from "@/lib/query-keys";
import type { MaskedDutyResponse } from "@/lib/types";

export default function DutiesPage() {
  const { selectedOfficeId, selectedOffice } = useOffice();
  const queryClient = useQueryClient();
  const [warning, setWarning] = useState<string | null>(null);
  const [showFlipModal, setShowFlipModal] = useState(false);

  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isPending } = useQuery<MaskedDutyResponse | null>({
    queryKey: queryKeys.duties(selectedOfficeId, currentMonth),
    queryFn: async () => {
      const res = await fetch(
        `/api/duties?month=${currentMonth}&officeId=${selectedOfficeId}`
      );
      const data: MaskedDutyResponse | null = await res.json();
      return data;
    },
    enabled: !!selectedOfficeId,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => {
      // 데이터 미존재(다른 탭이 새 게임 시작 가능) 또는 진행 중 → 1500ms polling.
      // 게임 종료(allFlipped) 시점에만 멈춤 (plan v3 Minor M1).
      const d = q.state.data;
      if (!d) return 1500;
      return d.allFlipped ? false : 1500;
    },
    refetchIntervalInBackground: true,
  });

  const showSkeleton = useDelayedPending(isPending);
  const duty = data ?? null;

  const drawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          officeId: selectedOfficeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as { duty: MaskedDutyResponse; warning: string | null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.duties(selectedOfficeId, currentMonth),
        data.duty
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.duties(selectedOfficeId),
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dutiesPage(selectedOfficeId),
        refetchType: "none",
      });
      setWarning(data.warning ?? null);
      setShowFlipModal(true);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const flipMutation = useMutation({
    mutationFn: async (cardIndex: number) => {
      const res = await fetch("/api/duties/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: currentMonth,
          officeId: selectedOfficeId,
          cardIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "flip failed");
      return data as MaskedDutyResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.duties(selectedOfficeId, currentMonth),
        data
      );
    },
  });

  const draw = async () => {
    if (!selectedOfficeId) return;
    // inProgress 상태는 메인 버튼이 disabled라 도달 불가. 완료된 게임 재뽑기 케이스만 confirm.
    if (duty && duty.cards.length > 0 && duty.allFlipped) {
      if (
        !confirm(
          `${selectedOffice?.name} 배정이 이미 있습니다. 새로 뽑으시겠습니까?`
        )
      )
        return;
    }
    drawMutation.mutate();
  };

  const rerun = () => {
    if (!selectedOfficeId) return;
    if (
      !confirm(
        "진행 중인 게임을 취소하고 새로 뽑으시겠습니까? 현재 공개된 카드는 모두 사라집니다."
      )
    )
      return;
    drawMutation.mutate();
  };

  const hasGame = !!duty && duty.cards.length > 0;
  const inProgress = hasGame && !duty.allFlipped;
  const showResults = hasGame && duty.allFlipped;

  // 결과 페이지에서 보일 항목별 그룹핑 (allFlipped 시점에만 노출)
  const groupedAssignments = showResults ? groupCardsByItem(duty.cards) : [];

  return (
    <div className="space-y-6">
      <BlurFade delay={0}>
        <PageHeader title="청소 배정" badge={currentMonth}>
          <Button
            variant="gradient-primary"
            size="lg"
            onClick={draw}
            disabled={drawMutation.isPending || !selectedOfficeId || inProgress}
            data-testid="main-draw-btn"
          >
            {drawMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Dices size={18} />
            )}
            {drawMutation.isPending ? "배정 중..." : "뽑기"}
          </Button>
        </PageHeader>
      </BlurFade>

      {showSkeleton ? (
        <DutiesSkeleton />
      ) : isPending ? null : (
        <>
          {warning && (
            <BlurFade delay={0.1}>
              <Alert>{warning}</Alert>
            </BlurFade>
          )}

          {hasGame && !duty.allFlipped && !showFlipModal && (
            <BlurFade delay={0.1}>
              <Card className="p-5 border-dashed">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">
                      진행 중인 게임이 있습니다
                    </div>
                    <div className="text-xs text-text-tertiary mt-1">
                      {duty.cards.filter((c) => c.isFlipped).length}/
                      {duty.cards.length} 카드 공개됨
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="md"
                      onClick={rerun}
                      disabled={drawMutation.isPending}
                      data-testid="rerun-btn"
                    >
                      새로 뽑기
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setShowFlipModal(true)}
                    >
                      참가하기
                    </Button>
                  </div>
                </div>
              </Card>
            </BlurFade>
          )}

          {showResults ? (
            <>
              <BlurFade delay={0.1}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedAssignments
                    .filter((g) => !g.isFree)
                    .map((g) => (
                      <Card key={g.name} hover className="p-5">
                        <div className="text-sm font-semibold text-text-primary pb-3 mb-3 border-b border-border-light">
                          {g.name}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {g.employees.map((name) => (
                            <Badge key={name} variant="primary">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ))}
                </div>
              </BlurFade>

              {duty.freeEmployee &&
                duty.freeEmployee.employeeNames.length > 0 && (
                  <BlurFade delay={0.2}>
                    <Card className="p-5 border-dashed">
                      <div className="text-sm font-semibold text-text-secondary pb-3 mb-3 border-b border-border-light">
                        프리 (미배정)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {duty.freeEmployee.employeeNames.map((name) => (
                          <Badge key={name} variant="neutral">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </BlurFade>
                )}

              <BlurFade delay={0.3}>
                <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                  <Clock size={14} />
                  배정일시: {new Date(duty.createdAt).toLocaleString("ko-KR")}
                </p>
              </BlurFade>
            </>
          ) : !hasGame ? (
            <BlurFade delay={0.1}>
              <Card>
                <EmptyState
                  icon={LayoutGrid}
                  title="이번 달 청소 배정이 없습니다"
                  description="상단의 뽑기 버튼을 눌러 배정을 시작하세요."
                />
              </Card>
            </BlurFade>
          ) : null}
        </>
      )}

      {showFlipModal && hasGame && (
        <CardFlipModal
          cards={duty.cards}
          allFlipped={duty.allFlipped}
          onCardClick={(cardIndex) => flipMutation.mutate(cardIndex)}
          onClose={() => setShowFlipModal(false)}
        />
      )}
    </div>
  );
}
