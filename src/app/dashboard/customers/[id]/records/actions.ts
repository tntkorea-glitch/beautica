"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function createServiceRecord(
  customerId: string,
  formData: FormData,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const serviceId = String(formData.get("service_id") ?? "").trim() || null;
  const staffId = String(formData.get("staff_id") ?? "").trim() || null;
  const bookingId = String(formData.get("booking_id") ?? "").trim() || null;
  const performedAtStr = String(formData.get("performed_at") ?? "").trim();
  const formula = String(formData.get("formula") ?? "").trim() || null;
  const techniques = String(formData.get("techniques") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // 사진 URL (콤마 구분으로 모든 path 전달)
  const beforeRaw = String(formData.get("before_photo_urls") ?? "").trim();
  const afterRaw = String(formData.get("after_photo_urls") ?? "").trim();
  const before_photo_urls = beforeRaw ? beforeRaw.split(",").filter(Boolean) : [];
  const after_photo_urls = afterRaw ? afterRaw.split(",").filter(Boolean) : [];

  const performed_at = performedAtStr
    ? new Date(performedAtStr).toISOString()
    : new Date().toISOString();

  const { error } = await admin.from("service_records").insert({
    shop_id: shop.id,
    customer_id: customerId,
    service_id: serviceId,
    staff_id: staffId,
    booking_id: bookingId,
    performed_at,
    before_photo_urls,
    after_photo_urls,
    formula,
    techniques,
    notes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customers/${customerId}/records`);
  if (bookingId) revalidatePath(`/dashboard/bookings/${bookingId}`);
  return {};
}

export async function deleteServiceRecord(
  customerId: string,
  recordId: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("service_records")
    .delete()
    .eq("id", recordId)
    .eq("shop_id", shop.id)
    .eq("customer_id", customerId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customers/${customerId}/records`);
  return {};
}
