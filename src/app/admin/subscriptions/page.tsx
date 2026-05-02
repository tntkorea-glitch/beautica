import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKST } from "@/lib/format";
import { isConfigured, isTestMode } from "@/lib/hyosung";

type SubRow = {
  id: string;
  shop_id: string;
  plan: string;
  monthly_fee: number;
  payment_kind: string;
  hms_member_id: string | null;
  status: string;
  billing_day: number;
  next_billing_at: string | null;
  last_billed_at: string | null;
  shop: { name: string; slug: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const PLAN_LABEL: Record<string, string> = {
  FREE: "무료",
  BASIC: "베이직",
  PRO: "프로",
};

export default async function AdminSubscriptionsPage() {
  const admin = createAdminClient();
  const configured = isConfigured();
  const testMode = isTestMode();

  const { data: subs } = await admin
    .from("shop_subscriptions")
    .select("id, shop_id, plan, monthly_fee, payment_kind, hms_member_id, status, billing_day, next_billing_at, last_billed_at, shop:shops(name, slug)")
    .order("created_at", { ascending: false });

  const list = (subs ?? []) as unknown as SubRow[];

  const { data: logs } = await admin
    .from("subscription_billing_logs")
    .select("id, shop_id, amount, charged_amount, points_used, status, billed_at")
    .order("billed_at", { ascending: false })
    .limit(20);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">구독 관리</h1>
          <p className="mt-1 text-sm text-gray-500">뷰티샵 월정액 청구 (효성CMS)</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {configured ? `효성CMS ${testMode ? "테스트" : "운영"} 모드` : "효성CMS 미설정"}
          </span>
          {!configured && (
            <span className="text-xs text-gray-400">BEAUTICA_HMS_SW_KEY / CUST_KEY / CUST_ID 필요</span>
          )}
        </div>
      </div>

      {!configured && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>효성CMS 환경변수 미설정.</strong> .env.local 에 아래 값을 추가하세요:
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs">
{`BEAUTICA_HMS_SW_KEY=your_sw_key
BEAUTICA_HMS_CUST_KEY=your_cust_key
BEAUTICA_HMS_CUST_ID=your_cust_id
BEAUTICA_HMS_MODE=test  # 운영 시 real`}
          </pre>
        </div>
      )}

      {/* 구독 목록 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">매장 구독 현황 ({list.length})</h2>
        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
            등록된 구독이 없습니다.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">매장</th>
                  <th className="px-4 py-3 text-left font-medium">플랜</th>
                  <th className="px-4 py-3 text-left font-medium">결제수단</th>
                  <th className="px-4 py-3 text-left font-medium">월정액</th>
                  <th className="px-4 py-3 text-left font-medium">상태</th>
                  <th className="px-4 py-3 text-left font-medium">다음 청구</th>
                  <th className="px-4 py-3 text-left font-medium">마지막 청구</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.shop?.name ?? "—"}</div>
                      <div className="text-xs text-gray-500">/{s.shop?.slug}</div>
                    </td>
                    <td className="px-4 py-3">{PLAN_LABEL[s.plan] ?? s.plan}</td>
                    <td className="px-4 py-3 text-xs">{s.payment_kind}</td>
                    <td className="px-4 py-3 font-mono">{s.monthly_fee.toLocaleString()}원</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {s.next_billing_at ? formatKST(s.next_billing_at, false) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {s.last_billed_at ? formatKST(s.last_billed_at, false) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 청구 이력 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">최근 청구 이력</h2>
        {(logs ?? []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            청구 이력 없음
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">청구일시</th>
                  <th className="px-4 py-3 text-left font-medium">청구액</th>
                  <th className="px-4 py-3 text-left font-medium">포인트차감</th>
                  <th className="px-4 py-3 text-left font-medium">실청구</th>
                  <th className="px-4 py-3 text-left font-medium">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(logs ?? []).map((l: Record<string, unknown>) => (
                  <tr key={l.id as string}>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatKST(l.billed_at as string)}</td>
                    <td className="px-4 py-3 font-mono">{(l.amount as number).toLocaleString()}원</td>
                    <td className="px-4 py-3 font-mono text-orange-600">-{(l.points_used as number).toLocaleString()}P</td>
                    <td className="px-4 py-3 font-mono font-semibold">{(l.charged_amount as number).toLocaleString()}원</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        l.status === "SUCCESS" || l.status === "POINT_COVERED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {l.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4">
        <Link href="/admin" className="text-xs text-gray-400 hover:underline">← 어드민 홈</Link>
      </div>
    </main>
  );
}
