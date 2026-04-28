"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function issuePass(input: {
  customerId: string;
  passType: "COUNT" | "PREPAID";
  serviceId: string | null;
  totalCount?: number | null;
  prepaidAmount?: number | null;
  expiresAt?: string | null;
  notes?: string | null;
  bookingIdForRevalidate?: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  if (input.passType === "COUNT") {
    if (!input.totalCount || input.totalCount < 1) {
      return { error: "회수권은 총 횟수가 1 이상이어야 합니다." };
    }
  } else if (input.passType === "PREPAID") {
    if (!input.prepaidAmount || input.prepaidAmount < 1) {
      return { error: "선불권은 충전 금액이 1 이상이어야 합니다." };
    }
  }

  const { error } = await admin.from("service_passes").insert({
    shop_id: shop.id,
    customer_id: input.customerId,
    service_id: input.serviceId,
    pass_type: input.passType,
    total_count: input.passType === "COUNT" ? input.totalCount : null,
    remaining_count: input.passType === "COUNT" ? input.totalCount : null,
    prepaid_amount: input.passType === "PREPAID" ? input.prepaidAmount : null,
    remaining_amount: input.passType === "PREPAID" ? input.prepaidAmount : null,
    expires_at: input.expiresAt || null,
    notes: input.notes || null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/customers/${input.customerId}`);
  if (input.bookingIdForRevalidate) {
    revalidatePath(`/dashboard/bookings/${input.bookingIdForRevalidate}`);
  }
  return {};
}

export async function consumePass(input: {
  passId: string;
  customerId: string;
  count?: number;       // COUNT 차감용 (default 1)
  amount?: number;      // PREPAID 차감용 (원)
  bookingIdForRevalidate?: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: pass } = await admin
    .from("service_passes")
    .select("id, pass_type, remaining_count, remaining_amount, is_active")
    .eq("id", input.passId)
    .eq("shop_id", shop.id)
    .eq("customer_id", input.customerId)
    .maybeSingle();

  if (!pass) return { error: "회수권을 찾을 수 없습니다." };
  if (!pass.is_active) return { error: "비활성화된 회수권입니다." };

  if (pass.pass_type === "COUNT") {
    const dec = input.count ?? 1;
    const remaining = (pass.remaining_count ?? 0) - dec;
    if (remaining < 0) return { error: "남은 횟수가 부족합니다." };
    const updates: Record<string, unknown> = { remaining_count: remaining };
    if (remaining === 0) updates.is_active = false; // 소진
    const { error } = await admin
      .from("service_passes")
      .update(updates)
      .eq("id", input.passId);
    if (error) return { error: error.message };
  } else if (pass.pass_type === "PREPAID") {
    const dec = input.amount ?? 0;
    if (dec <= 0) return { error: "차감 금액을 입력해주세요." };
    const remaining = (pass.remaining_amount ?? 0) - dec;
    if (remaining < 0) return { error: "잔액이 부족합니다." };
    const updates: Record<string, unknown> = { remaining_amount: remaining };
    if (remaining === 0) updates.is_active = false;
    const { error } = await admin
      .from("service_passes")
      .update(updates)
      .eq("id", input.passId);
    if (error) return { error: error.message };
  } else {
    return { error: "지원하지 않는 회수권 종류입니다." };
  }

  revalidatePath(`/dashboard/customers/${input.customerId}`);
  if (input.bookingIdForRevalidate) {
    revalidatePath(`/dashboard/bookings/${input.bookingIdForRevalidate}`);
  }
  return {};
}

export async function deactivatePass(
  passId: string,
  customerId: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_passes")
    .update({ is_active: false })
    .eq("id", passId)
    .eq("shop_id", shop.id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customers/${customerId}`);
  return {};
}
