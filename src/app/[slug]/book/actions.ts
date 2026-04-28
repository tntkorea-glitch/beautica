"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function submitPublicBooking(formData: FormData): Promise<Result> {
  const shopId = String(formData.get("shop_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestPhone = String(formData.get("guest_phone") ?? "").trim();
  const serviceId = String(formData.get("service_id") ?? "").trim();
  const startAtStr = String(formData.get("start_at") ?? "").trim();
  const customerNote = String(formData.get("customer_note") ?? "").trim() || null;

  if (!shopId || !serviceId) return { error: "잘못된 요청입니다." };
  if (!guestName) return { error: "이름을 입력해주세요." };
  if (!guestPhone) return { error: "연락처를 입력해주세요." };
  if (!startAtStr) return { error: "희망 일시를 선택해주세요." };

  const admin = createAdminClient();

  // 매장 + 시술 검증 (활성 상태인지)
  const [{ data: shop }, { data: service }] = await Promise.all([
    admin.from("shops").select("id, is_active").eq("id", shopId).maybeSingle(),
    admin
      .from("services")
      .select("id, shop_id, price_won, duration_min, is_active")
      .eq("id", serviceId)
      .maybeSingle(),
  ]);

  if (!shop || !shop.is_active) return { error: "예약을 받지 않는 매장입니다." };
  if (!service || !service.is_active || service.shop_id !== shopId) {
    return { error: "선택한 시술을 사용할 수 없습니다." };
  }

  const startAt = new Date(startAtStr);
  if (Number.isNaN(startAt.getTime())) return { error: "일시가 올바르지 않습니다." };
  if (startAt.getTime() < Date.now()) {
    return { error: "지난 시간으로는 예약할 수 없습니다." };
  }

  const endAt = new Date(startAt.getTime() + (service.duration_min ?? 60) * 60 * 1000);

  const { error } = await admin.from("bookings").insert({
    shop_id: shopId,
    service_id: serviceId,
    guest_name: guestName,
    guest_phone: guestPhone,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    price_won: service.price_won,
    customer_note: customerNote,
    status: "PENDING",
  });

  if (error) return { error: error.message };
  return {};
}
