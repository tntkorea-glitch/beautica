"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; emoji: string }[] = [
  { href: "/dashboard", label: "홈", emoji: "🏠" },
  { href: "/dashboard/bookings", label: "예약", emoji: "📅" },
  { href: "/dashboard/customers", label: "고객", emoji: "👤" },
  { href: "/dashboard/services", label: "시술 메뉴", emoji: "💇" },
  { href: "/dashboard/staff", label: "스태프", emoji: "👩‍💼" },
  { href: "/dashboard/consultations", label: "상담", emoji: "💬" },
  { href: "/dashboard/orders", label: "제품 주문", emoji: "🛍" },
  { href: "/dashboard/ai-assistant", label: "AI 어시스턴트", emoji: "🤖" },
  { href: "/dashboard/profile", label: "내 프로필", emoji: "🪪" },
  { href: "/dashboard/settings", label: "설정", emoji: "⚙️" },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 p-3">
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
    </nav>
  );
}
