import type { Metadata } from "next";
import Sidebar from "@/components/ui/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "청소 담당 관리",
  description: "회사 청소 담당 배정 프로그램",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="antialiased">
      <body className="min-h-screen">
        <Sidebar />
        <main className="ml-60 min-h-screen px-8 py-8">
          <div className="max-w-5xl animate-[fade-in-up_0.4s_ease-out]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
