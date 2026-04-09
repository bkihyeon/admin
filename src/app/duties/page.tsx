"use client";

import { useEffect, useState } from "react";
import { CleaningDuty } from "@/lib/types";

export default function DutiesPage() {
  const [duty, setDuty] = useState<CleaningDuty | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          청소 배정 ({currentMonth})
        </h2>
        <button
          onClick={handleDraw}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-lg font-medium"
        >
          {loading ? "뽑는 중..." : "🎲 랜덤 뽑기"}
        </button>
      </div>

      {warning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          ⚠️ {warning}
        </div>
      )}

      {duty ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {duty.assignments.map((a) => (
            <div
              key={a.dutyItemId}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="text-lg font-semibold text-gray-900 mb-3">
                {a.dutyItemName}
              </div>
              <div className="space-y-1">
                {a.assignedEmployeeNames.map((name, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 bg-blue-50 rounded text-blue-900 text-sm"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">
            이번 달 청소 배정이 아직 없습니다.
          </p>
          <p className="text-gray-400 mt-2">
            위의 &quot;랜덤 뽑기&quot; 버튼을 눌러 배정을 시작하세요.
          </p>
        </div>
      )}

      {duty && (
        <p className="text-sm text-gray-400">
          배정일시: {new Date(duty.createdAt).toLocaleString("ko-KR")}
        </p>
      )}
    </div>
  );
}
