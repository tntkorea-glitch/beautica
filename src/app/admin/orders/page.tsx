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

const TABS = [
  { label: "전체",     value: "" },
  { label: "입금 대기", value: "INCOME_PENDING" },
  { label: "결제 완료", value: "PAID" },
  { label: "준비 중",  value: "PREPARING" },
  { label: "배송 중",  value: "SHIPPING" },
  { label: "배송 완료", value: "DELIVERED" },
  { label: "취소",     value: "CANCELED" },
];

type OrderRow = {
  id: string;
  externalChannel: string | null;
  total: number | null;
  status: string;
  createdAt: string;
  paymentMethod: string | null;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("Order")
    .select("id, externalChannel, total, status, createdAt, paymentMethod")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  const orders = (data ?? []) as OrderRow[];

  const totalAmount = orders.reduce((s, o) => s + (o.total ?? 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">주문 관리</h1>
          <p className="mt-1 text-sm text-gray-500">티엔티몰 전체 주문 이력</p>
        </div>
        <div className="text-sm text-gray-500">
          {orders.length}건 · {totalAmount.toLocaleString()}원
        </div>
      </div>

      {/* 상태 탭 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = (status ?? "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/admin/orders?status=${tab.value}` : "/admin/orders"}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-white border text-gray-600 hover:border-gray-400"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          조회 오류: {error.message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          주문이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">주문번호</th>
                <th className="px-4 py-3 text-left font-medium">매장</th>
                <th className="px-4 py-3 text-left font-medium">결제 방법</th>
                <th className="px-4 py-3 text-right font-medium">금액</th>
                <th className="px-4 py-3 text-left font-medium">상태</th>
                <th className="px-4 py-3 text-left font-medium">주문일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{o.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-gray-900">{o.externalChannel ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {PAYMENT_METHOD_LABEL[o.paymentMethod ?? ""] ?? o.paymentMethod ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {(o.total ?? 0).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatKST(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link href="/admin" className="text-xs text-gray-400 hover:underline">← 대시보드</Link>
      </div>
    </main>
  );
}
