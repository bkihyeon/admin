"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  ClipboardCheck,
  Recycle,
  Clock,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/employees", label: "사원 관리", icon: Users },
  { href: "/settings", label: "담당항목 설정", icon: Settings },
  { href: "/duties", label: "청소 배정", icon: ClipboardCheck },
  { href: "/recycling", label: "분리수거", icon: Recycle },
  { href: "/history", label: "이력 조회", icon: Clock },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 w-60 h-screen bg-surface border-r border-border flex flex-col z-10">
      <div className="px-5 py-6 border-b border-border">
        <h1 className="text-lg font-bold text-text-primary tracking-tight">
          청소 담당 관리
        </h1>
        <p className="text-xs text-text-tertiary mt-0.5">Cleaning Duty Manager</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={1.5}
                className={isActive ? "text-primary-500" : "text-text-tertiary"}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-text-tertiary">v1.0</p>
      </div>
    </aside>
  );
}
