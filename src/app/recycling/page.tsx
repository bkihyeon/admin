"use client";

import { useEffect, useState } from "react";
import { RecyclingState } from "@/lib/types";

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">분리수거 관리</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg font-medium"
        >
          {loading ? "생성 중..." : "♻️ 다음 로테이션 생성"}
        </button>
      </div>

      {state?.totalEmployees === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          ⚠️ 등록된 사원이 없습니다. 먼저 사원을 등록해주세요.
        </div>
      )}

      {state && state.schedule.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {state.schedule.map((week) => (
              <div
                key={week.weekNumber}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="text-lg font-semibold text-gray-900 mb-3">
                  {week.weekNumber}주차
                </div>
                <div className="space-y-1">
                  {week.assignedEmployeeNames.map((name, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-green-50 rounded text-green-900 text-sm"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {state.updatedAt && (
            <p className="text-sm text-gray-400">
              갱신일시: {new Date(state.updatedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">
            분리수거 스케줄이 아직 없습니다.
          </p>
          <p className="text-gray-400 mt-2">
            위의 &quot;다음 로테이션 생성&quot; 버튼을 눌러 스케줄을 만드세요.
          </p>
        </div>
      )}

      {/* 로테이션 설명 */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <strong>로테이션 규칙:</strong> 사원 등록 순서대로 4명씩 4주간 담당합니다.
        모든 사원이 한 바퀴 돌면 다시 처음부터 순환합니다.
      </div>
    </div>
  );
}
