"use client";

import { useEffect, useState } from "react";
import { Employee } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { PlusCircle, Pencil, Trash2, Users } from "lucide-react";

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
      <PageHeader title="사원 관리" badge={`${employees.length}명`} />

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <PlusCircle size={16} className="text-primary-500" />
          사원 등록
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="이름 입력"
            className="flex-1 px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition-all"
          />
          <Button onClick={handleAdd}>등록</Button>
        </div>
      </Card>

      <Card>
        {employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="등록된 사원이 없습니다"
            description="첫 번째 사원을 등록해보세요."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-tertiary/50">
                <th className="text-left py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-16">번호</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">이름</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-40">관리</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className={`border-b border-border-light last:border-0 transition-colors duration-150 ${
                    editingId === emp.id ? "bg-primary-50/50" : "hover:bg-surface-secondary"
                  }`}
                >
                  <td className="py-4 px-5 text-xs text-text-tertiary font-mono">{idx + 1}</td>
                  <td className="py-4 px-5">
                    {editingId === emp.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(emp.id)}
                        className="px-3 py-1.5 bg-surface border border-primary-200 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-4 focus:ring-primary-50 transition-all"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-text-primary">{emp.name}</span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === emp.id ? (
                        <>
                          <Button size="sm" onClick={() => handleUpdate(emp.id)}>저장</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(emp.id); setEditName(emp.name); }}>
                            <Pencil size={14} /> 수정
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(emp.id, emp.name)}>
                            <Trash2 size={14} /> 삭제
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
