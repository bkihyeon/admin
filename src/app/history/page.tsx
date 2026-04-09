"use client";

import { useEffect, useState } from "react";
import { CleaningDuty } from "@/lib/types";

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">이력 조회</h2>

      {months.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">배정 이력이 없습니다.</p>
          <p className="text-gray-400 mt-2">
            &quot;청소 배정&quot; 페이지에서 랜덤 뽑기를 먼저 진행해주세요.
          </p>
        </div>
      ) : (
        <>
          {/* 월 선택 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              조회할 월 선택
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* 배정 내역 */}
          {selectedDuty && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {selectedDuty.month} 청소 배정
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDuty.assignments.map((a) => (
                  <div
                    key={a.dutyItemId}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                  >
                    <div className="font-medium text-gray-900">
                      {a.dutyItemName}
                    </div>
                    <div className="mt-2 space-y-1">
                      {a.assignedEmployeeNames.map((name, i) => (
                        <div key={i} className="text-sm text-gray-700">
                          • {name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-400">
                배정일시:{" "}
                {new Date(selectedDuty.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
