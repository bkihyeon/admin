"use client";

import { useEffect, useState, useMemo } from "react";
import { CleaningDuty, DutyAssignment } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { ClipboardCheck, Users, Clipboard, Building2 } from "lucide-react";

function groupByOffice(assignments: DutyAssignment[]): Map<string, { officeName: string | null; items: DutyAssignment[] }> {
  const groups = new Map<string, { officeName: string | null; items: DutyAssignment[] }>();
  for (const a of assignments) {
    const key = a.officeId ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, { officeName: a.officeName, items: [] });
    }
    groups.get(key)!.items.push(a);
  }
  return groups;
}

export default function Dashboard() {
  const [duty, setDuty] = useState<CleaningDuty | null>(null);

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

  useEffect(() => {
    fetch(`/api/duties?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDuty(data[0]);
      });
  }, [currentMonth]);

  const totalAssigned = duty?.assignments.reduce(
    (sum, a) => sum + a.assignedEmployeeNames.length,
    0
  ) ?? 0;

  type OfficeGroup = Map<string, { officeName: string | null; items: DutyAssignment[] }>;
  const officeGroups = useMemo<OfficeGroup>(
    () => (duty ? groupByOffice(duty.assignments) : new Map()),
    [duty]
  );

  return (
    <div className="space-y-8">
      <PageHeader title="대시보드" badge={today} />

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500">
              <Clipboard size={20} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs text-text-tertiary font-medium">배정 항목</p>
              <p className="text-2xl font-bold text-text-primary">
                {duty?.assignments.length ?? 0}
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

      {/* 이번 달 청소 배정 */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardCheck size={20} strokeWidth={1.5} className="text-primary-500" />
          <h3 className="text-base font-semibold text-text-primary">
            이번 달 청소 배정
          </h3>
          <Badge variant="neutral">{currentMonth}</Badge>
        </div>
        {duty ? (
          <div className="space-y-5">
            {Array.from(officeGroups.entries()).map(([key, { officeName, items }]) => (
              <div key={key}>
                <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                  <Building2 size={14} className="text-primary-400" />
                  {officeName ?? "미분류"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((a) => (
                    <div
                      key={a.dutyItemId}
                      className="rounded-lg bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-100 p-4"
                    >
                      <div className="text-sm font-semibold text-primary-800 mb-2">
                        {a.dutyItemName}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {a.assignedEmployeeNames.map((name, i) => (
                          <Badge key={i} variant="primary">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {duty.freeEmployees
                  ?.filter((f) => (f.officeId ?? "__none__") === key)
                  .map((f) =>
                    f.employeeNames.length > 0 ? (
                      <div key={`free-${key}`} className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-text-tertiary font-medium">프리:</span>
                        {f.employeeNames.map((name, i) => (
                          <Badge key={i} variant="neutral">{name}</Badge>
                        ))}
                      </div>
                    ) : null
                  )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clipboard}
            title="이번 달 배정이 없습니다"
            description="청소 배정 페이지에서 랜덤 뽑기를 진행해주세요."
            actionLabel="청소 배정으로 이동"
            actionHref="/duties"
          />
        )}
      </Card>
    </div>
  );
}
