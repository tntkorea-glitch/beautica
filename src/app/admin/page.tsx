import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminHome() {
  const admin = createAdminClient();

  const [pending, totalShops] = await Promise.all([
    admin
      .from("shops")
      .select("id", { count: "exact", head: true })
      .eq("tier_upgrade_status", "PENDING"),
    admin.from("shops").select("id", { count: "exact", head: true }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">관리자 대시보드</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/upgrades"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">등업 신청 대기</div>
          <div className="text-3xl font-bold text-gray-900">
            {pending.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">건</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">→ 검토하기</div>
        </Link>

        <div className="rounded-lg border bg-white p-5">
          <div className="mb-1 text-xs text-gray-500">총 매장 수</div>
          <div className="text-3xl font-bold text-gray-900">
            {totalShops.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">개</span>
          </div>
        </div>
      </div>
    </main>
  );
}
