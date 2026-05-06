"use server";

import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  registerSubscriptionMember,
  deleteSubscriptionMember,
  isConfigured,
} from "@/lib/hyosung";

export const PLAN_FEES: Record<string, number> = {
  FREE: 0,
  BASIC: 9900,
  PRO: 19900,
};

export const PLAN_LABELS: Record<string, string> = {
  FREE: "무료",
  BASIC: "베이직",
  PRO: "프로",
};

type SubscribeInput = {
  plan: string;
  paymentKind: "CARD" | "CMS";
  paymentNumber: string;
  payerName: string;
  payerNumber: string;
  paymentCompany?: string;
  billingDay: number;
};

export async function subscribePlan(input: SubscribeInput) {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { plan, paymentKind, paymentNumber, payerName, payerNumber, paymentCompany, billingDay } = input;
  const monthlyFee = PLAN_FEES[plan] ?? 0;

  const { data: existing } = await admin
    .from("shop_subscriptions")
    .select("id, hms_member_id, plan, status")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (plan === "FREE") {
    if (existing) {
      if (existing.hms_member_id) {
        try { await deleteSubscriptionMember(existing.hms_member_id as string); } catch { /* ignore */ }
      }
      await admin.from("shop_subscriptions").update({
        plan: "FREE",
        monthly_fee: 0,
        hms_member_id: null,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("shop_subscriptions").insert({
        shop_id: shop.id,
        plan: "FREE",
        monthly_fee: 0,
        payment_kind: "CMS",
        status: "ACTIVE",
        billing_day: billingDay,
      });
    }
    return { ok: true };
  }

  if (!isConfigured()) {
    return { error: "효성CMS 미설정 — 관리자에게 문의하세요" };
  }

  if (!paymentNumber || !payerName || !payerNumber) {
    return { error: "결제 정보를 모두 입력해주세요" };
  }
  if (paymentKind === "CMS" && !paymentCompany) {
    return { error: "은행을 선택해주세요" };
  }

  const memberId = `SHOP-${shop.slug}`;

  try {
    const needsHmsRegister = !existing?.hms_member_id;

    if (needsHmsRegister) {
      await registerSubscriptionMember({
        memberId,
        memberName: shop.owner_name || shop.name,
        phone: shop.phone || "",
        paymentKind,
        paymentNumber,
        payerName,
        payerNumber,
        paymentCompany: paymentCompany || undefined,
      });
    }

    const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
    const nextMonth = new Date(Date.UTC(nowKst.getUTCFullYear(), nowKst.getUTCMonth() + 1, billingDay));
    const nextBillingAt = nextMonth.toISOString();

    if (existing) {
      await admin.from("shop_subscriptions").update({
        plan,
        monthly_fee: monthlyFee,
        payment_kind: paymentKind,
        hms_member_id: memberId,
        status: "ACTIVE",
        billing_day: billingDay,
        next_billing_at: nextBillingAt,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("shop_subscriptions").insert({
        shop_id: shop.id,
        plan,
        monthly_fee: monthlyFee,
        payment_kind: paymentKind,
        hms_member_id: memberId,
        status: "ACTIVE",
        billing_day: billingDay,
        next_billing_at: nextBillingAt,
      });
    }

    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function cancelSubscription() {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("shop_subscriptions")
    .select("id, hms_member_id")
    .eq("shop_id", shop.id)
    .in("status", ["ACTIVE", "SUSPENDED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return { error: "활성 구독이 없습니다" };

  if (sub.hms_member_id) {
    try { await deleteSubscriptionMember(sub.hms_member_id as string); } catch { /* ignore */ }
  }

  await admin.from("shop_subscriptions").update({
    status: "CANCELLED",
    hms_member_id: null,
    updated_at: new Date().toISOString(),
  }).eq("id", sub.id);

  return { ok: true };
}
