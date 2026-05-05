"use client";

import { OfficeProvider } from "@/contexts/OfficeContext";
import QueryProvider from "@/components/QueryProvider";
import Sidebar from "@/components/ui/Sidebar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <OfficeProvider>
        <Sidebar />
        <main className="ml-60 min-h-screen px-8 py-8">
          <div className="max-w-5xl animate-[fade-in-up_0.4s_ease-out]">
            {children}
          </div>
        </main>
      </OfficeProvider>
    </QueryProvider>
  );
}
