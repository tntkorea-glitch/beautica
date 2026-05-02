import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatKST } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  INCOME_PENDING: "입금 대기",
  PAID: "결제 완료",
  PREPARING: "준비 중",
  SHIPPING: "배송 중",
  DELIVERED: "배송 완료",
  CANCELED: "취소",
};

const STATUS_STYLE: Record<string, string> = {
  INCOME_PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700",
  SHIPPING: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELED: "bg-gray-100 text-gray-500",
};

export default async function AdminHome() {
  const admin = createAdminClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    pendingMatches,
    pendingUpgrades,
    totalShops,
    monthlyOrders,
    pendingPaymentOrders,
    newShopsThisMonth,
    recentOrders,
  ] = await Promise.all([
    admin.from("shops").select("id", { count: "exact", head: true }).eq("match_status", "PENDING_REVIEW"),
    admin.from("shops").select("id", { count: "exact", head: true }).eq("tier_upgrade_status", "PENDING"),
    admin.from("shops").select("id", { count: "exact", head: true }),
    admin.from("Order").select("total").gte("createdAt", startOfMonth),
    admin.from("Order").select("id, total", { count: "exact" }).eq("status", "INCOME_PENDING"),
    admin.from("shops").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
    admin
      .from("Order")
      .select("id, externalChannel, total, status, createdAt, paymentMethod")
      .order("createdAt", { ascending: false })
      .limit(7),
  ]);

  const monthlyTotal = (monthlyOrders.data ?? []).reduce(
    (sum, o) => sum + ((o.total as number) ?? 0),
    0
  );
  const pendingTotal = (pendingPaymentOrders.data ?? []).reduce(
    (sum, o) => sum + ((o.total as number) ?? 0),
    0
  );

  type RecentOrder = {
    id: string;
    externalChannel: string | null;
    total: number | null;
    status: string;
    createdAt: string;
    paymentMethod: string | null;
  };
  const orders = (recentOrders.data ?? []) as RecentOrder[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">관리자 대시보드</h1>

      {/* 섹션 1: 처리 필요 */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">처리 필요</p>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/matches"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">거래처 매칭 신청 대기</div>
          <div className="text-3xl font-bold text-gray-900">
            {pendingMatches.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">건</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">→ 검토하기</div>
        </Link>

        <Link
          href="/admin/upgrades"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">등업 신청 대기</div>
          <div className="text-3xl font-bold text-gray-900">
            {pendingUpgrades.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">건</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">→ 검토하기</div>
        </Link>

        <Link
          href="/admin/shops"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">총 매장 수</div>
          <div className="text-3xl font-bold text-gray-900">
            {totalShops.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">개</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">→ 매장 관리</div>
        </Link>
      </div>

      {/* 섹션 2: 이번 달 현황 */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        이번 달 현황 ({now.getMonth() + 1}월)
      </p>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <div className="mb-1 text-xs text-gray-500">이번 달 주문 총액</div>
          <div className="text-3xl font-bold text-gray-900">
            {monthlyTotal.toLocaleString()}
            <span className="ml-1 text-base font-normal text-gray-400">원</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            주문 {monthlyOrders.data?.length ?? 0}건
          </div>
        </div>

        <Link
          href="/admin/shops"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">입금 대기 주문</div>
          <div className="text-3xl font-bold text-amber-600">
            {pendingPaymentOrders.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">건</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            미수금 {pendingTotal.toLocaleString()}원
          </div>
        </Link>

        <Link
          href="/admin/shops"
          className="block rounded-lg border bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
        >
          <div className="mb-1 text-xs text-gray-500">이번 달 신규 가입</div>
          <div className="text-3xl font-bold text-gray-900">
            {newShopsThisMonth.count ?? 0}
            <span className="ml-1 text-base font-normal text-gray-400">개</span>
          </div>
          <div className="mt-2 text-xs text-blue-600">→ 매장 목록</div>
        </Link>
      </div>

      {/* 섹션 3: 최근 주문 */}
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">최근 주문</p>
      <div className="rounded-lg border bg-white">
        {orders.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">주문 이력이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">주문번호</th>
                <th className="px-4 py-3 text-left font-medium">매장</th>
                <th className="px-4 py-3 text-left font-medium">결제 방법</th>
                <th className="px-4 py-3 text-right font-medium">금액</th>
                <th className="px-4 py-3 text-left font-medium">상태</th>
                <th className="px-4 py-3 text-left font-medium">주문일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.id}</td>
                  <td className="px-4 py-3 text-gray-900">{o.externalChannel ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {PAYMENT_METHOD_LABEL[o.paymentMethod ?? ""] ?? o.paymentMethod ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {(o.total ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatKST(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
