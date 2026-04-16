"use client";

import { useEffect, useState } from "react";
import { useOffice } from "@/contexts/OfficeContext";
import { CleaningDuty } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Clock } from "lucide-react";

export default function HistoryPage() {
  const { selectedOfficeId } = useOffice();
  const [duties, setDuties] = useState<CleaningDuty[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    if (!selectedOfficeId) return;
    fetch(`/api/duties?officeId=${selectedOfficeId}`)
      .then((r) => r.json())
      .then((data: CleaningDuty[]) => {
        setDuties(data);
        if (data.length > 0) setSelectedMonth(data[0].month);
        else setSelectedMonth("");
      });
  }, [selectedOfficeId]);

  const selectedDuty = duties.find((d) => d.month === selectedMonth);
  const months = duties.map((d) => d.month);
  const freeEmployees = selectedDuty?.freeEmployees?.[0];

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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDuty.assignments.map((a) => (
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

              {freeEmployees && freeEmployees.employeeNames.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-tertiary font-medium">프리:</span>
                  {freeEmployees.employeeNames.map((name, i) => (
                    <Badge key={i} variant="neutral">{name}</Badge>
                  ))}
                </div>
              )}

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
