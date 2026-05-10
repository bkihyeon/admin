"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOffice } from "@/contexts/OfficeContext";
import type { MaskedDutyResponse } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { ClipboardCheck, Users, Clipboard } from "lucide-react";
import { groupCardsByItem } from "@/lib/duties/cards";

export default function Dashboard() {
  const { selectedOfficeId } = useOffice();
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
    []
  );

  const { data, isLoading } = useQuery<MaskedDutyResponse | null>({
    queryKey: queryKeys.duties(selectedOfficeId, currentMonth),
    queryFn: async () => {
      const res = await fetch(`/api/duties?month=${currentMonth}&officeId=${selectedOfficeId}`);
      const data: MaskedDutyResponse | null = await res.json();
      return data;
    },
    enabled: !!selectedOfficeId,
  });

  const duty = data ?? null;
  const completed = !!duty && duty.allFlipped;

  if (isLoading) return <DashboardSkeleton />;

  const groups = completed ? groupCardsByItem(duty.cards) : [];
  const dutyItemGroups = groups.filter((g) => !g.isFree);
  const totalAssigned = dutyItemGroups.reduce((sum, g) => sum + g.employees.length, 0);
  const freeEmployee = duty?.freeEmployee;

  return (
    <div className="space-y-8">
      <PageHeader title="대시보드" badge={today} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500">
              <Clipboard size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">배정 항목</p>
              <p className="text-2xl font-bold text-text-primary">
                {dutyItemGroups.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center text-success-500">
              <Users size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">배정 인원</p>
              <p className="text-2xl font-bold text-text-primary">{totalAssigned}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardCheck size={20} strokeWidth={1.5} className="text-primary-500" />
          <h3 className="text-base font-semibold text-text-primary">
            이번 달 청소 배정
          </h3>
          <Badge variant="neutral">{currentMonth}</Badge>
          {duty && !duty.allFlipped && duty.cards.length > 0 && (
            <Badge variant="primary">진행 중</Badge>
          )}
        </div>
        {completed ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dutyItemGroups.map((g) => (
                <div
                  key={g.name}
                  className="rounded-lg bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-100 p-4"
                >
                  <div className="text-sm font-semibold text-primary-800 mb-2">
                    {g.name}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.employees.map((name, i) => (
                      <Badge key={i} variant="primary">{name}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {freeEmployee && freeEmployee.employeeNames.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-tertiary font-medium">프리:</span>
                {freeEmployee.employeeNames.map((name, i) => (
                  <Badge key={i} variant="neutral">{name}</Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Clipboard}
            title={
              duty && duty.cards.length > 0
                ? "이번 달 게임이 진행 중입니다"
                : "이번 달 배정이 없습니다"
            }
            description={
              duty && duty.cards.length > 0
                ? "청소 배정 페이지에서 카드를 모두 공개하세요."
                : "청소 배정 페이지에서 랜덤 뽑기를 진행해주세요."
            }
            actionLabel="청소 배정으로 이동"
            actionHref="/duties"
          />
        )}
      </Card>
    </div>
  );
}
