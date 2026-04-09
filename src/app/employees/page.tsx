"use client";

import { useEffect, useState } from "react";
import { Employee } from "@/lib/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchEmployees = () => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then(setEmployees);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    fetchEmployees();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    fetchEmployees();
  };

  const handleDelete = async (id: string, employeeName: string) => {
    if (!confirm(`"${employeeName}" 사원을 삭제하시겠습니까?`)) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">사원 관리</h2>

      {/* 사원 등록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">사원 등록</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="이름 입력"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            등록
          </button>
        </div>
      </div>

      {/* 사원 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          사원 목록 ({employees.length}명)
        </h3>
        {employees.length === 0 ? (
          <p className="text-gray-500">등록된 사원이 없습니다.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  번호
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  이름
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-4 text-sm text-gray-600">{idx + 1}</td>
                  <td className="py-3 px-4">
                    {editingId === emp.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdate(emp.id)
                        }
                        className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-900">{emp.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {editingId === emp.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(emp.id)}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(emp.id);
                            setEditName(emp.name);
                          }}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
