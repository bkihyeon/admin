"use client";

import { useEffect, useState, useMemo } from "react";
import { CleaningDuty, DutyAssignment, Office } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Dices, Loader2, Clock, LayoutGrid, Building2 } from "lucide-react";

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

export default function DutiesPage() {
  const [duty, setDuty] = useState<CleaningDuty | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingOffice, setLoadingOffice] = useState<string | null>(null);

  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetch(`/api/duties?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDuty(data[0]);
        else setDuty(null);
      });
    fetch("/api/offices").then((r) => r.json()).then(setOffices);
  }, [currentMonth]);

  const draw = async (officeId?: string) => {
    const isAll = !officeId;
    const officeName = officeId ? offices.find((o) => o.id === officeId)?.name : undefined;
    const label = isAll ? "전체" : officeName;

    if (duty) {
      const existing = isAll
        ? duty.assignments.length > 0
        : duty.assignments.some((a) => a.officeId === officeId);
      if (existing && !confirm(`${label} 배정이 이미 있습니다. 새로 뽑으시겠습니까?`)) return;
    }

    if (isAll) setLoadingAll(true);
    else setLoadingOffice(officeId);
    setWarning(null);

    const res = await fetch("/api/duties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: currentMonth, officeId }),
    });

    const data = await res.json();
    setLoadingAll(false);
    setLoadingOffice(null);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setDuty(data.duty);
    if (data.warning) setWarning(data.warning);
  };

  type OfficeGroup = Map<string, { officeName: string | null; items: DutyAssignment[] }>;
  const officeGroups = useMemo<OfficeGroup>(
    () => (duty ? groupByOffice(duty.assignments) : new Map()),
    [duty]
  );

  const isLoading = loadingAll || loadingOffice !== null;

  return (
    <div className="space-y-6">
      <PageHeader title="청소 배정" badge={currentMonth}>
        <Button variant="gradient-primary" size="lg" onClick={() => draw()} disabled={isLoading}>
          {loadingAll ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />}
          {loadingAll ? "배정 중..." : "전체 뽑기"}
        </Button>
      </PageHeader>

      {warning && <Alert>{warning}</Alert>}

      {/* 사무실별 뽑기 버튼 */}
      {offices.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {offices.map((office) => (
            <Button
              key={office.id}
              variant="primary"
              size="sm"
              onClick={() => draw(office.id)}
              disabled={isLoading}
            >
              {loadingOffice === office.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Dices size={14} />
              )}
              {office.name} 뽑기
            </Button>
          ))}
        </div>
      )}

      {duty && duty.assignments.length > 0 ? (
        <>
          {Array.from(officeGroups.entries()).map(([key, { officeName, items }]) => (
            <div key={key} className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Building2 size={16} className="text-primary-500" />
                {officeName ?? "미분류"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((a) => (
                  <Card key={a.dutyItemId} hover className="p-5">
                    <div className="text-sm font-semibold text-text-primary pb-3 mb-3 border-b border-border-light">
                      {a.dutyItemName}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {a.assignedEmployeeNames.map((name, i) => (
                        <Badge key={i} variant="primary">{name}</Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
              {duty.freeEmployees
                ?.filter((f) => (f.officeId ?? "__none__") === key)
                .map((f) =>
                  f.employeeNames.length > 0 ? (
                    <Card key={`free-${key}`} className="p-5 border-dashed">
                      <div className="text-sm font-semibold text-text-secondary pb-3 mb-3 border-b border-border-light">
                        프리 (미배정)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {f.employeeNames.map((name, i) => (
                          <Badge key={i} variant="neutral">{name}</Badge>
                        ))}
                      </div>
                    </Card>
                  ) : null
                )}
            </div>
          ))}
          <p className="text-xs text-text-tertiary flex items-center gap-1.5">
            <Clock size={14} />
            배정일시: {new Date(duty.createdAt).toLocaleString("ko-KR")}
          </p>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={LayoutGrid}
            title="이번 달 청소 배정이 없습니다"
            description="상단의 뽑기 버튼을 눌러 배정을 시작하세요."
          />
        </Card>
      )}
    </div>
  );
}
