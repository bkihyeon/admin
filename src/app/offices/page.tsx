"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOffice } from "@/contexts/OfficeContext";
import { queryKeys } from "@/lib/query-keys";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { Building2, PlusCircle, Pencil, Trash2 } from "lucide-react";

export default function OfficesPage() {
  const { offices } = useOffice();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.offices });

  const addMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: () => alert("사무실 추가에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/offices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => alert("사무실 수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/offices/${id}`, { method: "DELETE" });
    },
    onSuccess: () => invalidate(),
    onError: () => alert("사무실 삭제에 실패했습니다."),
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    addMutation.mutate();
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate(id);
  };

  const handleDelete = (id: string, officeName: string) => {
    if (!confirm(`"${officeName}" 사무실을 삭제하시겠습니까?\n소속 사원/항목의 사무실이 해제됩니다.`)) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="사무실 관리" />

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <PlusCircle size={16} className="text-primary-500" />
          사무실 추가
        </h3>
        <div className="flex gap-3">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleAdd()}
            placeholder="사무실 이름 입력"
            className="flex-1"
          />
          <Button onClick={handleAdd}>추가</Button>
        </div>
      </Card>

      <Card>
        {offices.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="등록된 사무실이 없습니다"
            description="첫 번째 사무실을 등록해보세요."
          />
        ) : (
          <div className="divide-y divide-border-light">
            {offices.map((office) => (
              <div
                key={office.id}
                className="flex items-center justify-between py-4 px-5"
              >
                {editingId === office.id ? (
                  <Input
                    inputSize="sm"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleUpdate(office.id)}
                    autoFocus
                    className="flex-1 mr-3"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-primary-500" />
                    <span className="text-sm font-medium text-text-primary">{office.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {editingId === office.id ? (
                    <>
                      <Button size="sm" onClick={() => handleUpdate(office.id)}>저장</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(office.id); setEditName(office.name); }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(office.id, office.name)}>
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
