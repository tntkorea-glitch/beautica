import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

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

type OrderRow = {
  id: string;
  createdAt: string;
  customerCompanyId: string | null;
  total: number | null;
  subtotal: number | null;
  shippingFee: number | null;
  status: string;
  paymentMethod: string | null;
  source: string | null;
  externalOrderNo: string | null;
  recipient: string | null;
  phone: string | null;
  zipcode: string | null;
  address1: string | null;
  address2: string | null;
  memo: string | null;
};

type OrderItemRow = {
  productProdCd: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: orderData } = await admin
    .from("Order")
    .select(
      'id, createdAt, customerCompanyId, total, subtotal, "shippingFee", status, paymentMethod, source, "externalOrderNo", recipient, phone, zipcode, address1, address2, memo',
    )
    .eq("id", id)
    .maybeSingle();

  if (!orderData) notFound();
  const order = orderData as unknown as OrderRow;

  // 본인 매장 주문인지 확인
  if (order.customerCompanyId !== shop.customer_company_id) {
    notFound();
  }

  const { data: itemsData } = await admin
    .from("OrderItem")
    .select('"productProdCd", "productName", "unitPrice", quantity')
    .eq("orderId", id);
  const items = (itemsData ?? []) as unknown as OrderItemRow[];

  const fullAddress = [order.zipcode, order.address1, order.address2]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="max-w-3xl">
      <div className="mb-2 text-xs text-gray-500">
        <Link href="/dashboard/orders" className="hover:underline">
          ← 주문 이력
        </Link>
      </div>

      <header className="mb-6 rounded-lg border border-rose-gold-100 bg-white p-5">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <h1 className="font-mono text-xl font-bold text-gray-900">{order.id}</h1>
        </div>
        <div className="grid gap-1 text-sm text-gray-700 md:grid-cols-2">
          <div>주문일: {new Date(order.createdAt).toLocaleString("ko-KR")}</div>
          <div>결제 방법: {order.paymentMethod ?? "-"}</div>
          {order.externalOrderNo && (
            <div className="md:col-span-2 text-xs text-gray-400">
              멱등 키: <span className="font-mono">{order.externalOrderNo}</span>
            </div>
          )}
        </div>
      </header>

      {/* 상품 */}
      <section className="mb-6 rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">📦 주문 상품</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">상품</th>
              <th className="py-2 text-right font-medium">단가</th>
              <th className="py-2 text-right font-medium">수량</th>
              <th className="py-2 text-right font-medium">소계</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((it) => (
              <tr key={it.productProdCd}>
                <td className="py-2">
                  <div className="font-medium text-gray-900">{it.productName}</div>
                  <div className="font-mono text-xs text-gray-400">{it.productProdCd}</div>
                </td>
                <td className="py-2 text-right font-mono">{it.unitPrice.toLocaleString()}원</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right font-mono">
                  {(it.unitPrice * it.quantity).toLocaleString()}원
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr className="border-t">
              <td colSpan={3} className="py-2 text-right text-gray-600">상품 합계</td>
              <td className="py-2 text-right font-mono">
                {(order.subtotal ?? 0).toLocaleString()}원
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="py-1 text-right text-gray-600">배송비</td>
              <td className="py-1 text-right font-mono">
                {(order.shippingFee ?? 0).toLocaleString()}원
              </td>
            </tr>
            <tr className="border-t">
              <td colSpan={3} className="py-2 text-right font-semibold">총 결제</td>
              <td className="py-2 text-right font-mono text-base font-semibold text-rose-gold-700">
                {(order.total ?? 0).toLocaleString()}원
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* 배송 */}
      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">🚚 배송 정보</h2>
        <div className="space-y-1 text-sm text-gray-700">
          <div>
            <span className="text-xs text-gray-500">수령인</span>{" "}
            <strong>{order.recipient ?? "-"}</strong>
          </div>
          <div>
            <span className="text-xs text-gray-500">연락처</span>{" "}
            <span className="font-mono">{order.phone ?? "-"}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500">주소</span> {fullAddress || "-"}
          </div>
          {order.memo && (
            <div>
              <span className="text-xs text-gray-500">메모</span> {order.memo}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
