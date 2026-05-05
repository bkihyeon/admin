"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOffice } from "@/contexts/OfficeContext";
import { DutyItem } from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import SettingsSkeleton from "@/components/skeletons/SettingsSkeleton";
import { PlusCircle, Pencil, Trash2, Settings } from "lucide-react";

export default function SettingsPage() {
  const { selectedOfficeId } = useOffice();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState(1);

  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.dutyItems(selectedOfficeId),
    queryFn: async () => {
      const res = await fetch(`/api/duty-items?officeId=${selectedOfficeId}`);
      return res.json() as Promise<DutyItem[]>;
    },
    enabled: !!selectedOfficeId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.dutyItems(selectedOfficeId) });

  const addMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/duty-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, requiredCount: count, officeId: selectedOfficeId }),
      });
    },
    onSuccess: () => {
      setName("");
      setCount(1);
      invalidate();
    },
    onError: () => alert("항목 추가에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/duty-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, requiredCount: editCount, officeId: selectedOfficeId }),
      });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => alert("항목 수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/duty-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => invalidate(),
    onError: () => alert("항목 삭제에 실패했습니다."),
  });

  const handleAdd = () => {
    if (!name.trim() || !selectedOfficeId) return;
    addMutation.mutate();
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate(id);
  };

  const handleDelete = (id: string, itemName: string) => {
    if (!confirm(`"${itemName}" 항목을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(id);
  };

  if (isLoading) return <SettingsSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="담당항목 설정" />

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <PlusCircle size={16} className="text-primary-500" />
          항목 추가
        </h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">항목명</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleAdd()}
              placeholder="예: 빗자루, 청소기, 대걸레..."
              className="w-full"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-text-secondary mb-1.5">인원수</label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
              min={1}
              className="w-full text-center"
            />
          </div>
          <Button onClick={handleAdd}>추가</Button>
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="등록된 담당항목이 없습니다"
            description="청소 배정에 사용할 항목을 추가해주세요."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-tertiary/50">
                <th className="text-left py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">항목명</th>
                <th className="text-center py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-24">인원수</th>
                <th className="text-right py-3 px-5 text-xs font-semibold text-text-tertiary uppercase tracking-wider w-40">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-border-light last:border-0 transition-colors duration-150 ${
                    editingId === item.id ? "bg-primary-50/50" : "hover:bg-surface-secondary"
                  }`}
                >
                  <td className="py-4 px-5">
                    {editingId === item.id ? (
                      <Input
                        inputSize="sm"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleUpdate(item.id)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-text-primary">{item.name}</span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-center">
                    {editingId === item.id ? (
                      <Input
                        inputSize="sm"
                        type="number"
                        value={editCount}
                        onChange={(e) => setEditCount(Math.max(1, Number(e.target.value)))}
                        onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleUpdate(item.id)}
                        min={1}
                        className="w-16 text-center"
                      />
                    ) : (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700">
                        {item.requiredCount}명
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === item.id ? (
                        <>
                          <Button size="sm" onClick={() => handleUpdate(item.id)}>저장</Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(item.id); setEditName(item.name); setEditCount(item.requiredCount); }}>
                            <Pencil size={14} /> 수정
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(item.id, item.name)}>
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
