import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargeMonthlyFee, isConfigured } from "@/lib/hyosung";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isConfigured()) {
    return NextResponse.json({ error: "효성CMS 환경변수 미설정", skipped: true });
  }

  const admin = createAdminClient();
  const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
  const todayDay = nowKst.getUTCDate();

  // 오늘 billing_day 이면서 ACTIVE 구독 조회
  const { data: subs, error: subErr } = await admin
    .from("shop_subscriptions")
    .select("id, shop_id, plan, monthly_fee, payment_kind, hms_member_id, billing_day")
    .eq("status", "ACTIVE")
    .eq("billing_day", todayDay)
    .gt("monthly_fee", 0)
    .not("hms_member_id", "is", null);

  if (subErr) {
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  const results: Array<{ shopId: string; status: string; error?: string }> = [];

  for (const sub of subs ?? []) {
    try {
      const result = await chargeMonthlyFee({
        memberId: sub.hms_member_id as string,
        monthlyFee: sub.monthly_fee as number,
        paymentKind: sub.payment_kind as "CARD" | "CMS",
      });

      const chargeStatus = result.charged
        ? (result.chargeAmount === 0 ? "POINT_COVERED" : "SUCCESS")
        : "FAILED";

      // 청구 이력 기록
      await admin.from("subscription_billing_logs").insert({
        shop_id: sub.shop_id,
        subscription_id: sub.id,
        transaction_id: `BTC-${sub.shop_id}-${Date.now()}`,
        amount: sub.monthly_fee,
        points_used: result.pointsUsed ?? 0,
        charged_amount: result.chargeAmount ?? 0,
        payment_kind: sub.payment_kind,
        status: chargeStatus,
        hms_response: result.payment ?? null,
      });

      // 다음 청구일 업데이트
      const nextMonth = new Date(nowKst);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      const nextBillingAt = new Date(
        Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), sub.billing_day as number)
      ).toISOString();

      await admin.from("shop_subscriptions").update({
        last_billed_at: new Date().toISOString(),
        next_billing_at: nextBillingAt,
        status: chargeStatus === "FAILED" ? "SUSPENDED" : "ACTIVE",
      }).eq("id", sub.id);

      results.push({ shopId: sub.shop_id as string, status: chargeStatus });
    } catch (err) {
      const msg = (err as Error).message;

      await admin.from("subscription_billing_logs").insert({
        shop_id: sub.shop_id,
        subscription_id: sub.id,
        transaction_id: `BTC-ERR-${sub.shop_id}-${Date.now()}`,
        amount: sub.monthly_fee,
        points_used: 0,
        charged_amount: 0,
        payment_kind: sub.payment_kind,
        status: "FAILED",
        hms_response: { error: msg },
      });

      await admin.from("shop_subscriptions").update({ status: "SUSPENDED" }).eq("id", sub.id);

      results.push({ shopId: sub.shop_id as string, status: "FAILED", error: msg });
    }
  }

  return NextResponse.json({
    billed: results.length,
    date: nowKst.toISOString().slice(0, 10),
    results,
  });
}
