"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { suffix: "", label: "프로필" },
  { suffix: "/records", label: "시술 기록" },
  { suffix: "/charts", label: "상담차트" },
  { suffix: "/consents", label: "동의서" },
  { suffix: "/passes", label: "회수권" },
  { suffix: "/points", label: "포인트" },
];

export function CustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/customers/${customerId}`;

  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => {
        const href = `${base}${tab.suffix}`;
        const active =
          tab.suffix === ""
            ? pathname === base
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={
              active
                ? "-mb-px border-b-2 border-rose-gold-600 px-4 py-2 text-sm font-semibold text-rose-gold-700"
                : "px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
