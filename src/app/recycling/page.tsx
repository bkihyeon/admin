"use client";

import { useEffect, useState } from "react";
import { RecyclingState } from "@/lib/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { RefreshCw, Loader2, AlertTriangle, Clock, Info, Recycle } from "lucide-react";

interface RecyclingResponse extends RecyclingState {
  totalEmployees: number;
}

export default function RecyclingPage() {
  const [state, setState] = useState<RecyclingResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecycling = () => {
    fetch("/api/recycling")
      .then((r) => r.json())
      .then(setState);
  };

  useEffect(() => {
    fetchRecycling();
  }, []);

  const handleGenerate = async () => {
    if (
      state?.schedule.length &&
      !confirm("새로운 4주 로테이션을 생성하시겠습니까? 현재 스케줄이 교체됩니다.")
    )
      return;

    setLoading(true);
    const res = await fetch("/api/recycling", { method: "POST" });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error);
      return;
    }

    setState({ ...data, totalEmployees: state?.totalEmployees ?? 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="분리수거 관리">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-success-500 to-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:from-success-600 hover:to-emerald-600 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {loading ? "생성 중..." : "다음 로테이션 생성"}
        </button>
      </PageHeader>

      {state?.totalEmployees === 0 && (
        <div className="flex items-start gap-3 bg-warning-50 border-l-4 border-warning-500 rounded-r-lg p-4">
          <AlertTriangle size={18} className="text-warning-500 shrink-0 mt-0.5" />
          <p className="text-sm text-warning-600">
            등록된 사원이 없습니다. 먼저 사원을 등록해주세요.
          </p>
        </div>
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
                  {week.assignedEmployeeNames.map((name, i) => (
                    <Badge key={i} variant="success">{name}</Badge>
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
          <Info size={18} strokeWidth={1.5} className="text-primary-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">로테이션 규칙</p>
            <p className="text-sm text-text-secondary mt-0.5">
              사원 등록 순서대로 4명씩 4주간 담당합니다.
              모든 사원이 한 바퀴 돌면 다시 처음부터 순환합니다.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
