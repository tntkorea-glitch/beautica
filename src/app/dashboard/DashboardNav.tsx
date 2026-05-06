"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Plan } from "@/lib/plan";

const NAV_ITEMS: { href: string; label: string; emoji: string }[] = [
  { href: "/dashboard", label: "홈", emoji: "🏠" },
  { href: "/dashboard/bookings", label: "예약", emoji: "📅" },
  { href: "/dashboard/stats", label: "통계", emoji: "📊" },
  { href: "/dashboard/customers", label: "고객", emoji: "👤" },
  { href: "/dashboard/services", label: "시술 메뉴", emoji: "💇" },
  { href: "/dashboard/staff", label: "스태프", emoji: "👩‍💼" },
  { href: "/dashboard/consultations", label: "상담", emoji: "💬" },
  { href: "/dashboard/orders", label: "제품 주문", emoji: "🛍" },
  { href: "/dashboard/ai-assistant", label: "AI 어시스턴트", emoji: "🤖" },
  { href: "/dashboard/referral", label: "추천 링크", emoji: "🔗" },
  { href: "/dashboard/subscription", label: "구독 플랜", emoji: "💳" },
  { href: "/dashboard/profile", label: "내 프로필", emoji: "🪪" },
  { href: "/dashboard/settings", label: "설정", emoji: "⚙️" },
];

const PLAN_BADGE: Record<Plan, { label: string; className: string }> = {
  FREE:  { label: "FREE",  className: "bg-gray-100 text-gray-500" },
  BASIC: { label: "BASIC", className: "bg-blue-100 text-blue-700" },
  PRO:   { label: "PRO",   className: "bg-amber-100 text-amber-700" },
};

export function DashboardNav({ plan }: { plan: Plan }) {
  const pathname = usePathname();
  const badge = PLAN_BADGE[plan];

  return (
    <nav className="flex h-full flex-col p-3">
      <div className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                  : "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              }
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 플랜 배지 */}
      <Link
        href="/dashboard/subscription"
        className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100"
      >
        <span className="text-xs text-gray-500">현재 플랜</span>
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${badge.className}`}>
          {badge.label}
        </span>
      </Link>
    </nav>
  );
}
