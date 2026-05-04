import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import SubscriptionForm from "./SubscriptionForm";

type SubRow = {
  id: string;
  plan: string;
  monthly_fee: number;
  payment_kind: string;
  hms_member_id: string | null;
  status: string;
  billing_day: number;
  next_billing_at: string | null;
  last_billed_at: string | null;
};

type LogRow = {
  id: string;
  amount: number;
  charged_amount: number;
  points_used: number;
  status: string;
  billed_at: string;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "이용 중",  cls: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "정지됨",  cls: "bg-amber-100 text-amber-700" },
  CANCELLED: { label: "해지됨",  cls: "bg-gray-100 text-gray-500" },
};

const PLAN_BADGE: Record<string, string> = {
  FREE:  "bg-gray-100 text-gray-600",
  BASIC: "bg-blue-100 text-blue-700",
  PRO:   "bg-rose-100 text-rose-700",
};

const LOG_STATUS_CLS: Record<string, string> = {
  SUCCESS:       "bg-green-100 text-green-700",
  POINT_COVERED: "bg-emerald-100 text-emerald-700",
  FAILED:        "bg-red-100 text-red-600",
};

export default async function SubscriptionPage() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: subData } = await admin
    .from("shop_subscriptions")
    .select("id, plan, monthly_fee, payment_kind, hms_member_id, status, billing_day, next_billing_at, last_billed_at")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sub = subData as SubRow | null;

  const { data: logData } = await admin
    .from("subscription_billing_logs")
    .select("id, amount, charged_amount, points_used, status, billed_at")
    .eq("shop_id", shop.id)
    .order("billed_at", { ascending: false })
    .limit(10);

  const logs = (logData ?? []) as LogRow[];

  const currentPlan = (sub?.plan ?? "FREE") as "FREE" | "BASIC" | "PRO";
  const currentStatus = sub?.status ?? null;
  const isActivePaid = sub && currentStatus === "ACTIVE" && currentPlan !== "FREE";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">구독 플랜</h1>
        <p className="mt-1 text-sm text-gray-500">요금제를 선택하고 결제 수단을 등록하세요.</p>
      </div>

      {/* 현재 구독 상태 카드 (유료 플랜) */}
      {sub && currentPlan !== "FREE" && (
        <div className={`rounded-xl border p-5 ${
          currentStatus === "ACTIVE" ? "border-green-200 bg-green-50" :
          currentStatus === "SUSPENDED" ? "border-amber-200 bg-amber-50" :
          "border-gray-200 bg-gray-50"
        }`}>
          <div className="mb-3 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE[currentPlan] ?? ""}`}>
              {currentPlan}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[currentStatus ?? ""]?.cls ?? ""}`}>
              {STATUS_BADGE[currentStatus ?? ""]?.label ?? currentStatus}
            </span>
            <span className="text-sm font-semibold text-gray-800">
              {sub.monthly_fee.toLocaleString()}원/월 · 매월 {sub.billing_day}일
            </span>
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <span>결제 방식: {sub.payment_kind === "CMS" ? "계좌이체" : "카드"}</span>
            {sub.next_billing_at && (
              <span>다음 청구: {formatKST(sub.next_billing_at, false)}</span>
            )}
            {sub.last_billed_at && (
              <span>마지막 청구: {formatKST(sub.last_billed_at, false)}</span>
            )}
          </div>

          {currentStatus === "SUSPENDED" && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-100 p-3 text-xs text-amber-800">
              <strong>청구 실패로 구독이 정지되었습니다.</strong> 아래에서 결제 수단을 업데이트하거나 재가입하세요.
            </div>
          )}
        </div>
      )}

      {/* 플랜 선택 + 가입 폼 */}
      <SubscriptionForm
        currentPlan={currentPlan}
        currentStatus={currentStatus}
        hasHmsMember={!!sub?.hms_member_id}
      />

      {/* 청구 이력 */}
      {logs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">청구 이력</h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">청구일시</th>
                  <th className="px-4 py-3 text-right font-medium">청구액</th>
                  <th className="px-4 py-3 text-right font-medium">포인트</th>
                  <th className="px-4 py-3 text-right font-medium">실청구</th>
                  <th className="px-4 py-3 text-left font-medium">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatKST(log.billed_at)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs">{log.amount.toLocaleString()}원</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-orange-600">
                      {log.points_used > 0 ? `-${log.points_used.toLocaleString()}P` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{log.charged_amount.toLocaleString()}원</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${LOG_STATUS_CLS[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.status === "SUCCESS" ? "성공" : log.status === "POINT_COVERED" ? "포인트 전액" : "실패"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isActivePaid && logs.length === 0 && (
        <p className="text-xs text-gray-400">청구 이력이 없습니다.</p>
      )}
    </div>
  );
}
