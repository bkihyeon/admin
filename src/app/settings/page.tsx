"use client";

import { useEffect, useState } from "react";
import { DutyItem } from "@/lib/types";

export default function SettingsPage() {
  const [items, setItems] = useState<DutyItem[]>([]);
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState(1);

  const fetchItems = () => {
    fetch("/api/duty-items")
      .then((r) => r.json())
      .then(setItems);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await fetch("/api/duty-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, requiredCount: count }),
    });
    setName("");
    setCount(1);
    fetchItems();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/duty-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, requiredCount: editCount }),
    });
    setEditingId(null);
    fetchItems();
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`"${itemName}" 항목을 삭제하시겠습니까?`)) return;
    await fetch(`/api/duty-items/${id}`, { method: "DELETE" });
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">담당항목 설정</h2>

      {/* 항목 추가 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">항목 추가</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">항목명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="예: 빗자루, 청소기, 대걸레..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm text-gray-600 mb-1">인원수</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
              min={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* 항목 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          담당항목 목록 ({items.length}개)
        </h3>
        {items.length === 0 ? (
          <p className="text-gray-500">등록된 담당항목이 없습니다.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  항목명
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  인원수
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 px-4">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-900">{item.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editCount}
                        onChange={(e) =>
                          setEditCount(Math.max(1, Number(e.target.value)))
                        }
                        min={1}
                        className="w-20 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-gray-900"
                      />
                    ) : (
                      <span className="text-gray-600">{item.requiredCount}명</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(item.id)}
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
                            setEditingId(item.id);
                            setEditName(item.name);
                            setEditCount(item.requiredCount);
                          }}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
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
