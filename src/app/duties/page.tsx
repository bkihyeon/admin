"use client";

import { useEffect, useState } from "react";
import { CleaningDuty } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Dices, Loader2, Clock, LayoutGrid } from "lucide-react";

export default function DutiesPage() {
  const [duty, setDuty] = useState<CleaningDuty | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetch(`/api/duties?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDuty(data[0]);
        else setDuty(null);
      });
  }, [currentMonth]);

  const handleDraw = async () => {
    if (
      duty &&
      !confirm("이미 이번 달 배정이 있습니다. 새로 뽑으시겠습니까?")
    )
      return;

    setLoading(true);
    setWarning(null);

    const res = await fetch("/api/duties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: currentMonth }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setDuty(data.duty);
    if (data.warning) setWarning(data.warning);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="청소 배정" badge={currentMonth}>
        <Button variant="gradient-primary" size="lg" onClick={handleDraw} disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />}
          {loading ? "배정 중..." : "랜덤 뽑기"}
        </Button>
      </PageHeader>

      {warning && <Alert>{warning}</Alert>}

      {duty ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {duty.assignments.map((a) => (
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
            description="상단의 랜덤 뽑기 버튼을 눌러 배정을 시작하세요."
          />
        </Card>
      )}
    </div>
  );
}
