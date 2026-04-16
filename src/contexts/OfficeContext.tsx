"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { Office } from "@/lib/types";

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
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/offices")
      .then((r) => r.json())
      .then((data: Office[]) => {
        if (cancelled) return;
        setOffices(data);
        const stored = localStorage.getItem(STORAGE_KEY);
        const valid = stored && data.some((o) => o.id === stored);
        if (valid) {
          setSelectedOfficeIdState(stored);
        } else if (data.length > 0) {
          setSelectedOfficeIdState(data[0].id);
          localStorage.setItem(STORAGE_KEY, data[0].id);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const setSelectedOfficeId = (id: string) => {
    setSelectedOfficeIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const refreshOffices = useCallback(async () => {
    const res = await fetch("/api/offices");
    const data: Office[] = await res.json();
    setOffices(data);
  }, []);

  const selectedOffice = offices.find((o) => o.id === selectedOfficeId) ?? null;

  return (
    <OfficeContext.Provider
      value={{ offices, selectedOfficeId, selectedOffice, setSelectedOfficeId, loading, refreshOffices }}
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
