import Link from "next/link";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";

type Order = {
  id: string;
  createdAt: string;
  total: number | null;
  status: string;
  paymentMethod: string | null;
  items: { productName: string; quantity: number }[] | null;
};

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

export default async function OrdersPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  if (!shop.customer_company_id) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">제품 주문</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          ⚠️ tnt-mall 거래처 매핑 (customer_company_id) 이 아직 안 되어 있어요. onboarding 을 다시 진행해주세요.
        </div>
      </div>
    );
  }

  // tnt-mall Order 직접 SELECT
  const { data, error } = await admin
    .from("Order")
    .select("id, createdAt, total, status, paymentMethod")
    .eq("customerCompanyId", shop.customer_company_id)
    .order("createdAt", { ascending: false })
    .limit(50);

  // OrderItem 은 별도 fetch (요약용)
  const orderIds = (data ?? []).map((o) => o.id);
  let itemsMap = new Map<string, { productName: string; quantity: number }[]>();
  if (orderIds.length > 0) {
    const { data: itemsData } = await admin
      .from("OrderItem")
      .select("orderId, productName, quantity")
      .in("orderId", orderIds);
    for (const item of itemsData ?? []) {
      const arr = itemsMap.get(item.orderId) ?? [];
      arr.push({ productName: item.productName, quantity: item.quantity });
      itemsMap.set(item.orderId, arr);
    }
  }

  const list: Order[] = (data ?? []).map((o) => ({
    id: o.id,
    createdAt: o.createdAt,
    total: o.total,
    status: o.status,
    paymentMethod: o.paymentMethod,
    items: itemsMap.get(o.id) ?? null,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">제품 주문</h1>
          <p className="mt-1 text-sm text-gray-600">
            tnt-mall 제품 주문 이력. 신규 주문은 우측 버튼.
          </p>
        </div>
        <Link
          href="/dashboard/orders/new"
          className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700"
        >
          + 신규 주문
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-xs text-red-700">
          주문 이력 조회 실패: {error.message}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mb-2 text-3xl">🛍</div>
          <p className="mb-1 text-sm font-medium text-gray-700">아직 주문 이력이 없어요</p>
          <p className="mb-4 text-xs text-gray-500">
            첫 주문을 하면 자주 구매 상품 카드도 자동으로 노출됩니다.
          </p>
          <Link
            href="/dashboard/orders/new"
            className="inline-block rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700"
          >
            + 첫 주문
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
              className="block rounded-lg border bg-white p-4 transition hover:border-rose-gold-300 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[o.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  <span className="font-mono text-sm text-gray-700">{o.id}</span>
                  <span className="text-xs text-gray-400">
                    {formatKST(o.createdAt)}
                  </span>
                </div>
                <span className="font-mono text-base font-semibold text-rose-gold-700">
                  {(o.total ?? 0).toLocaleString()}원
                </span>
              </div>
              {o.items && o.items.length > 0 && (
                <div className="mt-2 line-clamp-1 text-sm text-gray-600">
                  {o.items
                    .slice(0, 3)
                    .map((it) => `${it.productName} ×${it.quantity}`)
                    .join(" · ")}
                  {o.items.length > 3 && ` 외 ${o.items.length - 3}건`}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
