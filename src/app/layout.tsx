import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "청소 담당 관리",
  description: "회사 청소 담당 배정 프로그램",
};

const NAV_ITEMS = [
  { href: "/", label: "대시보드" },
  { href: "/employees", label: "사원 관리" },
  { href: "/settings", label: "담당항목 설정" },
  { href: "/duties", label: "청소 배정" },
  { href: "/recycling", label: "분리수거" },
  { href: "/history", label: "이력 조회" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-8">
            <h1 className="text-lg font-bold text-gray-900 shrink-0">
              🧹 청소 담당 관리
            </h1>
            <div className="flex gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md whitespace-nowrap transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
