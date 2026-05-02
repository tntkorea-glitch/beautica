import { notFound } from "next/navigation";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";

const TYPE_LABEL: Record<string, { text: string; cls: string }> = {
  EARN_BOOKING:  { text: "예약 적립",      cls: "bg-emerald-100 text-emerald-700" },
  EARN_DEPOSIT:  { text: "예약금 적립",    cls: "bg-emerald-100 text-emerald-700" },
  SPEND_TNTMALL: { text: "tnt-mall 사용", cls: "bg-orange-100 text-orange-700" },
  SPEND_BEAUTICA:{ text: "사용",           cls: "bg-orange-100 text-orange-700" },
  EXPIRE:        { text: "만료",           cls: "bg-gray-100 text-gray-500" },
  ADMIN_ADJUST:  { text: "관리자 조정",    cls: "bg-purple-100 text-purple-700" },
};

type Tx = {
  id: string;
  created_at: string;
  amount: number;
  balance_after: number;
  type: string;
  description: string | null;
  expires_at: string | null;
};

export default async function CustomerPointsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("id", id)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!customer) notFound();

  const phone = (customer as { phone: string | null }).phone;

  if (!phone) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
        전화번호가 없어 포인트를 조회할 수 없습니다.
      </div>
    );
  }

  // customer_ledger는 전화번호 기반 전역 포인트
  const { data: ledger } = await admin
    .from("customer_ledger")
    .select("point_balance, total_earned, total_spent")
    .eq("phone", phone)
    .maybeSingle();

  const { data: txRows } = await admin
    .from("point_transactions")
    .select("id, created_at, amount, balance_after, type, description, expires_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(50);

  const txs = (txRows ?? []) as unknown as Tx[];

  return (
    <div className="space-y-4">
      {/* 잔액 카드 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "현재 포인트", value: ledger?.point_balance ?? 0, color: "text-rose-600" },
          { label: "총 적립", value: ledger?.total_earned ?? 0, color: "text-emerald-600" },
          { label: "총 사용", value: ledger?.total_spent ?? 0, color: "text-orange-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-white p-4 text-center">
            <div className={`text-2xl font-bold tabular-nums ${card.color}`}>
              {card.value.toLocaleString()}P
            </div>
            <div className="mt-1 text-xs text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 거래 내역 */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 text-sm font-semibold text-gray-700">포인트 내역</div>
        {txs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">내역 없음</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {txs.map((tx) => {
              const label = TYPE_LABEL[tx.type] ?? { text: tx.type, cls: "bg-gray-100 text-gray-600" };
              const isEarn = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${label.cls}`}>
                      {label.text}
                    </span>
                    <div>
                      <div className="text-sm text-gray-700">{tx.description ?? label.text}</div>
                      <div className="text-xs text-gray-400">{formatKST(tx.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold tabular-nums ${isEarn ? "text-emerald-600" : "text-orange-600"}`}>
                      {isEarn ? "+" : ""}{tx.amount.toLocaleString()}P
                    </div>
                    <div className="text-xs text-gray-400">잔액 {tx.balance_after.toLocaleString()}P</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        포인트는 예약 완료 시 결제금액의 1% 자동 적립. tnt-mall 주문 시 사용 가능. 유효기간 12개월.
      </p>
    </div>
  );
}
