"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminToggle() {
  const pathname = usePathname() ?? "";
  const onAdmin = pathname.startsWith("/admin");

  const baseClass = "rounded px-3 py-1 text-xs font-medium transition";
  const activeShop = "bg-white text-gray-900 shadow-sm";
  const activeAdmin = "bg-red-50 text-red-700 shadow-sm";
  const inactive = "text-gray-500 hover:text-gray-800";

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 p-0.5">
      <Link
        href="/dashboard"
        className={`${baseClass} ${onAdmin ? inactive : activeShop}`}
      >
        매장 모드
      </Link>
      <Link
        href="/admin"
        className={`${baseClass} ${onAdmin ? activeAdmin : inactive}`}
      >
        관리자 모드
      </Link>
    </div>
  );
}
