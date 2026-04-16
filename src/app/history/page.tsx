"use client";

import { useEffect, useState, useMemo } from "react";
import { CleaningDuty, DutyAssignment } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Clock, Building2 } from "lucide-react";

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

export default function HistoryPage() {
  const [duties, setDuties] = useState<CleaningDuty[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    fetch("/api/duties")
      .then((r) => r.json())
      .then((data: CleaningDuty[]) => {
        setDuties(data);
        if (data.length > 0) setSelectedMonth(data[0].month);
      });
  }, []);

  const selectedDuty = duties.find((d) => d.month === selectedMonth);
  const months = duties.map((d) => d.month);

  type OfficeGroup = Map<string, { officeName: string | null; items: DutyAssignment[] }>;
  const officeGroups = useMemo<OfficeGroup>(
    () => (selectedDuty ? groupByOffice(selectedDuty.assignments) : new Map()),
    [selectedDuty]
  );

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
                onClick={() => setSelectedMonth(m)}
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

              {Array.from(officeGroups.entries()).map(([key, { officeName, items }]) => (
                <div key={key} className="mb-5 last:mb-0">
                  <h4 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <Building2 size={14} className="text-primary-400" />
                    {officeName ?? "미분류"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((a) => (
                      <div
                        key={a.dutyItemId}
                        className="rounded-lg bg-surface-secondary border border-border-light p-4"
                      >
                        <div className="text-sm font-semibold text-text-primary mb-2">
                          {a.dutyItemName}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {a.assignedEmployeeNames.map((name, i) => (
                            <Badge key={i} variant="neutral">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* 해당 사무실의 프리 사원 */}
                  {selectedDuty.freeEmployees
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

              <p className="mt-4 text-xs text-text-tertiary flex items-center gap-1.5">
                <Clock size={14} />
                배정일시: {new Date(selectedDuty.createdAt).toLocaleString("ko-KR")}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
