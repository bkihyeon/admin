"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useState } from "react";
import HistorySkeleton from "@/components/skeletons/HistorySkeleton";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useOffice } from "@/contexts/OfficeContext";
import { groupCardsByItem } from "@/lib/duties/cards";
import { queryKeys } from "@/lib/query-keys";
import type { MaskedDutyResponse } from "@/lib/types";

export default function HistoryPage() {
  const { selectedOfficeId } = useOffice();
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);

  const { data: allDuties = [], isLoading } = useQuery<MaskedDutyResponse[]>({
    queryKey: queryKeys.duties(selectedOfficeId),
    queryFn: async () => {
      const res = await fetch(`/api/duties?officeId=${selectedOfficeId}`);
      return res.json() as Promise<MaskedDutyResponse[]>;
    },
    enabled: !!selectedOfficeId,
  });

  // 진행 중 게임은 history에 노출하지 않음.
  const duties = allDuties.filter((d) => d.allFlipped);

  const pickedValid =
    pickedMonth && duties.some((d) => d.month === pickedMonth);
  const selectedMonth = pickedValid ? pickedMonth : (duties[0]?.month ?? "");
  const selectedDuty = duties.find((d) => d.month === selectedMonth);
  const months = duties.map((d) => d.month);

  if (isLoading) return <HistorySkeleton />;

  const groups = selectedDuty ? groupCardsByItem(selectedDuty.cards) : [];
  const dutyItemGroups = groups.filter((g) => !g.isFree);
  const freeEmployeeNames = selectedDuty?.freeEmployee?.employeeNames ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="이력 조회" />

      {months.length === 0 ? (
        <Card>
          <EmptyState
            icon={Clock}
            title="배정 이력이 없습니다"
            description="청소 배정 페이지에서 랜덤 뽑기를 먼저 진행해주세요."
            actionLabel="청소 배정으로 이동"
            actionHref="/duties"
          />
        </Card>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPickedMonth(m)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedMonth === m
                    ? "bg-primary-600 text-white shadow-button"
                    : "bg-surface-tertiary text-text-secondary hover:bg-primary-50 hover:text-primary-600"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {selectedDuty && (
            <Card className="p-6">
              <h3 className="text-base font-semibold text-text-primary mb-4">
                {selectedDuty.month} 청소 배정
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
                  <span className="text-xs text-text-tertiary font-medium">
                    프리:
                  </span>
                  {freeEmployeeNames.map((name) => (
                    <Badge key={name} variant="neutral">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="mt-4 text-xs text-text-tertiary flex items-center gap-1.5">
                <Clock size={14} />
                배정일시:{" "}
                {new Date(selectedDuty.createdAt).toLocaleString("ko-KR")}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
