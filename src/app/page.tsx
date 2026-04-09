"use client";

import { useEffect, useState } from "react";
import { CleaningDuty, RecyclingState } from "@/lib/types";

export default function Dashboard() {
  const [duty, setDuty] = useState<CleaningDuty | null>(null);
  const [recycling, setRecycling] = useState<RecyclingState | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetch(`/api/duties?month=${currentMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDuty(data[0]);
      });

    fetch("/api/recycling")
      .then((r) => r.json())
      .then(setRecycling);
  }, [currentMonth]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>

      {/* 이번 달 청소 배정 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📋 이번 달 청소 배정 ({currentMonth})
        </h3>
        {duty ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {duty.assignments.map((a) => (
              <div
                key={a.dutyItemId}
                className="bg-blue-50 rounded-lg p-4 border border-blue-100"
              >
                <div className="font-medium text-blue-900">{a.dutyItemName}</div>
                <div className="mt-1 text-sm text-blue-700">
                  {a.assignedEmployeeNames.join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            이번 달 청소 배정이 아직 없습니다. &quot;청소 배정&quot; 페이지에서 뽑기를 진행해주세요.
          </p>
        )}
      </section>

      {/* 분리수거 스케줄 */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ♻️ 분리수거 스케줄
        </h3>
        {recycling && recycling.schedule.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recycling.schedule.map((week) => (
              <div
                key={week.weekNumber}
                className="bg-green-50 rounded-lg p-4 border border-green-100"
              >
                <div className="font-medium text-green-900">
                  {week.weekNumber}주차
                </div>
                <div className="mt-1 text-sm text-green-700">
                  {week.assignedEmployeeNames.join(", ")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            분리수거 스케줄이 아직 없습니다. &quot;분리수거&quot; 페이지에서 로테이션을 생성해주세요.
          </p>
        )}
      </section>
    </div>
  );
}
