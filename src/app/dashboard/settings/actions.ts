"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function updateNaverBooking(
  enabled: boolean,
  businessId: string,
  placeUrl: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // URL 간단 검증
  const trimmedUrl = placeUrl.trim();
  if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
    return { error: "네이버 매장 URL 은 http:// 또는 https:// 로 시작해야 합니다." };
  }

  const { error } = await admin
    .from("shops")
    .update({
      naver_booking_enabled: enabled,
      naver_booking_business_id: businessId.trim() || null,
      naver_place_url: trimmedUrl || null,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/${shop.slug}`);
  return {};
}
