"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { queryKeys } from "@/lib/query-keys";
import type { Office } from "@/lib/types";

interface OfficeContextValue {
  offices: Office[];
  selectedOfficeId: string | null;
  selectedOffice: Office | null;
  setSelectedOfficeId: (id: string) => void;
  loading: boolean;
  refreshOffices: () => void;
}

const OfficeContext = createContext<OfficeContextValue | null>(null);

const STORAGE_KEY = "selectedOfficeId";

export function OfficeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // 사용자가 직접 선택했거나 localStorage에서 복원한 ID. offices에 없으면 파생 단계에서 fallback
  const [pickedOfficeId, setPickedOfficeIdState] = useState<string | null>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem(STORAGE_KEY) ?? null;
      }
      return null;
    }
  );

  const { data: offices = [], isLoading } = useQuery({
    queryKey: queryKeys.offices,
    queryFn: async () => {
      const res = await fetch("/api/offices");
      return res.json() as Promise<Office[]>;
    },
  });

  // pickedOfficeId가 현재 offices 목록에 없으면 첫 항목으로 파생 (state 갱신 없음)
  const pickedValid =
    pickedOfficeId && offices.some((o) => o.id === pickedOfficeId);
  const selectedOfficeId = pickedValid
    ? pickedOfficeId
    : (offices[0]?.id ?? null);
  const selectedOffice = offices.find((o) => o.id === selectedOfficeId) ?? null;

  const setSelectedOfficeId = useCallback((id: string) => {
    setPickedOfficeIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const refreshOffices = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.offices });
  }, [queryClient]);

  return (
    <OfficeContext.Provider
      value={{
        offices,
        selectedOfficeId,
        selectedOffice,
        setSelectedOfficeId,
        loading: isLoading,
        refreshOffices,
      }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const ctx = useContext(OfficeContext);
  if (!ctx) throw new Error("useOffice must be used within OfficeProvider");
  return ctx;
}
