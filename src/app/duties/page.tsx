"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOffice } from "@/contexts/OfficeContext";
import { CleaningDuty } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import DutiesSkeleton from "@/components/skeletons/DutiesSkeleton";
import { Dices, Loader2, Clock, LayoutGrid } from "lucide-react";
import CardFlipModal from "@/components/CardFlipModal";

export default function DutiesPage() {
  const { selectedOfficeId, selectedOffice } = useOffice();
  const queryClient = useQueryClient();
  const [warning, setWarning] = useState<string | null>(null);
  const [showFlipModal, setShowFlipModal] = useState(false);

  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: duty = null, isLoading } = useQuery({
    queryKey: queryKeys.duties(selectedOfficeId, currentMonth),
    queryFn: async () => {
      const res = await fetch(`/api/duties?month=${currentMonth}&officeId=${selectedOfficeId}`);
      const data: CleaningDuty | null = await res.json();
      return data;
    },
    enabled: !!selectedOfficeId,
  });

  const drawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, officeId: selectedOfficeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as { duty: CleaningDuty; warning?: string };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.duties(selectedOfficeId, currentMonth), data.duty);
      // history 페이지의 전체 목록 캐시는 stale 표시만 하고 즉시 refetch는 안 함 (history 진입 시 백그라운드 갱신)
      queryClient.invalidateQueries({
        queryKey: queryKeys.duties(selectedOfficeId),
        refetchType: "none",
      });
      setWarning(data.warning ?? null);
      setShowFlipModal(true);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const draw = async () => {
    if (!selectedOfficeId) return;
    if (duty && duty.assignments.length > 0) {
      if (!confirm(`${selectedOffice?.name} 배정이 이미 있습니다. 새로 뽑으시겠습니까?`)) return;
    }
    drawMutation.mutate();
  };

  const freeEmployee = duty?.freeEmployee;

  if (isLoading) return <DutiesSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="청소 배정" badge={currentMonth}>
        <Button variant="gradient-primary" size="lg" onClick={draw} disabled={drawMutation.isPending || !selectedOfficeId}>
          {drawMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />}
          {drawMutation.isPending ? "배정 중..." : "뽑기"}
        </Button>
      </PageHeader>

      {warning && <Alert>{warning}</Alert>}

      {duty && duty.assignments.length > 0 ? (
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

          {freeEmployee && freeEmployee.employeeNames.length > 0 && (
            <Card className="p-5 border-dashed">
              <div className="text-sm font-semibold text-text-secondary pb-3 mb-3 border-b border-border-light">
                프리 (미배정)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {freeEmployee.employeeNames.map((name, i) => (
                  <Badge key={i} variant="neutral">{name}</Badge>
                ))}
              </div>
            </Card>
          )}

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

      {showFlipModal && duty && (
        <CardFlipModal
          duty={duty}
          onClose={() => setShowFlipModal(false)}
        />
      )}
    </div>
  );
}
