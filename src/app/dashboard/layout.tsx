import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { isAdminEmail } from "@/lib/admin";
import { Logo } from "@/components/brand/Logo";
import { DashboardNav } from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, shop } = await requireShop();
  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Logo size="md" />
            </Link>
            <span className="text-sm text-gray-500">/ {shop.name}</span>
            <TierBadge tier={shop.tier} status={shop.tier_upgrade_status} />
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
              >
                관리자
              </Link>
            )}
            <span className="text-xs text-gray-500">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="w-52 shrink-0 border-r bg-white">
          <DashboardNav />
        </aside>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function TierBadge({
  tier,
  status,
}: {
  tier: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | null;
}) {
  const tierLabel = { 1: "일반", 2: "뷰티샵", 3: "VIP" }[tier] ?? `tier ${tier}`;
  const tierClass =
    tier === 3
      ? "bg-purple-100 text-purple-700"
      : tier === 2
      ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-1">
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${tierClass}`}>
        {tierLabel}
      </span>
      {status === "PENDING" && (
        <span
          className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
          title="관리자 승인 대기 중"
        >
          승인 대기
        </span>
      )}
      {status === "REJECTED" && (
        <span
          className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
          title="등업 신청 거절됨"
        >
          거절됨
        </span>
      )}
    </div>
  );
}
