"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Info, Loader2, Recycle, RefreshCw } from "lucide-react";
import RecyclingSkeleton from "@/components/skeletons/RecyclingSkeleton";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { queryKeys } from "@/lib/query-keys";
import type { RecyclingState } from "@/lib/types";

interface RecyclingResponse extends RecyclingState {
  totalEmployees: number;
}

export default function RecyclingPage() {
  const queryClient = useQueryClient();

  const { data: state, isLoading } = useQuery({
    queryKey: queryKeys.recycling,
    queryFn: async () => {
      const res = await fetch("/api/recycling");
      return res.json() as Promise<RecyclingResponse>;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recycling", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as RecyclingState;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.recycling, {
        ...data,
        totalEmployees: state?.totalEmployees ?? 0,
      });
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const handleGenerate = () => {
    if (
      state?.schedule.length &&
      !confirm(
        "새로운 4주 로테이션을 생성하시겠습니까? 현재 스케줄이 교체됩니다."
      )
    )
      return;
    generateMutation.mutate();
  };

  if (isLoading) return <RecyclingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="분리수거 관리">
        <Button
          variant="gradient-success"
          size="lg"
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          {generateMutation.isPending ? "생성 중..." : "다음 로테이션 생성"}
        </Button>
      </PageHeader>

      {state?.totalEmployees === 0 && (
        <Alert>등록된 사원이 없습니다. 먼저 사원을 등록해주세요.</Alert>
      )}

      {state && state.schedule.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {state.schedule.map((week) => (
              <Card key={week.weekNumber} hover className="overflow-hidden">
                <div className="bg-success-50 px-5 py-3 border-b border-success-100">
                  <span className="text-sm font-bold text-success-700">
                    {week.weekNumber}주차
                  </span>
                </div>
                <div className="p-4 flex flex-wrap gap-1.5">
                  {week.assignedEmployeeNames.map((name) => (
                    <Badge key={name} variant="success">
                      {name}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {state.updatedAt && (
            <p className="text-xs text-text-tertiary flex items-center gap-1.5">
              <Clock size={14} />
              갱신일시: {new Date(state.updatedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Recycle}
            title="분리수거 스케줄이 없습니다"
            description="상단의 버튼을 눌러 로테이션을 생성하세요."
          />
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Info
            size={18}
            strokeWidth={1.5}
            className="text-primary-400 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">
              로테이션 규칙
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              사원 등록 순서대로 4명씩 4주간 담당합니다. 모든 사원이 한 바퀴
              돌면 다시 처음부터 순환합니다.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
