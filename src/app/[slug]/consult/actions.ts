"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function submitPublicConsult(formData: FormData): Promise<Result> {
  const shopId = String(formData.get("shop_id") ?? "").trim();
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestPhone = String(formData.get("guest_phone") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim();

  if (!shopId) return { error: "잘못된 요청입니다." };
  if (!guestName) return { error: "이름을 입력해주세요." };
  if (!guestPhone) return { error: "연락처를 입력해주세요." };
  if (!message) return { error: "문의 내용을 입력해주세요." };

  const admin = createAdminClient();
  const { data: shop } = await admin
    .from("shops")
    .select("id, is_active")
    .eq("id", shopId)
    .maybeSingle();
  if (!shop || !shop.is_active) return { error: "상담을 받지 않는 매장입니다." };

  const { error } = await admin.from("consultations").insert({
    shop_id: shopId,
    guest_name: guestName,
    guest_phone: guestPhone,
    category,
    message,
    status: "NEW",
  });

  if (error) return { error: error.message };
  return {};
}
