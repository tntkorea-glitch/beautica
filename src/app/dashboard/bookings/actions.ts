"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function createBooking(formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const customerId = String(formData.get("customer_id") ?? "").trim() || null;
  const serviceId = String(formData.get("service_id") ?? "").trim() || null;
  const staffId = String(formData.get("staff_id") ?? "").trim() || null;
  const guestName = String(formData.get("guest_name") ?? "").trim() || null;
  const guestPhone = String(formData.get("guest_phone") ?? "").trim() || null;
  const startAtStr = String(formData.get("start_at") ?? "").trim();
  const customerNote = String(formData.get("customer_note") ?? "").trim() || null;
  const shopNote = String(formData.get("shop_note") ?? "").trim() || null;
  const priceStr = String(formData.get("price_won") ?? "").replace(/\D/g, "");

  if (!startAtStr) return { error: "시작 시간을 선택해주세요." };
  if (!customerId && !guestName) {
    return { error: "기존 고객을 선택하거나 게스트 이름을 입력해주세요." };
  }
  if (!serviceId) return { error: "시술 메뉴를 선택해주세요." };

  // 시술 정보 조회 (가격/소요시간)
  const { data: service } = await admin
    .from("services")
    .select("price_won, duration_min")
    .eq("id", serviceId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!service) return { error: "선택한 시술 메뉴를 찾을 수 없습니다." };

  const startAt = new Date(startAtStr);
  if (Number.isNaN(startAt.getTime())) return { error: "시작 시간이 올바르지 않습니다." };

  const duration = service.duration_min ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
  const priceWon = priceStr ? Number(priceStr) : Number(service.price_won);

  const { error } = await admin.from("bookings").insert({
    shop_id: shop.id,
    customer_id: customerId,
    service_id: serviceId,
    staff_id: staffId,
    guest_name: customerId ? null : guestName,
    guest_phone: customerId ? null : guestPhone,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    price_won: priceWon,
    customer_note: customerNote,
    shop_note: shopNote,
    status: "CONFIRMED", // 운영자 직접 등록은 자동 확정
    confirmed_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bookings");
  redirect("/dashboard/bookings");
}

export async function confirmBooking(bookingId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ status: "CONFIRMED", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .eq("status", "PENDING");

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bookings");
  return {};
}

export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    })
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .in("status", ["PENDING", "CONFIRMED"]);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bookings");
  return {};
}

export async function completeBooking(bookingId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // 예약 + 고객 정보 조회
  const { data: booking } = await admin
    .from("bookings")
    .select("customer_id, status")
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!booking) return { error: "예약을 찾을 수 없습니다." };
  if (booking.status !== "CONFIRMED") {
    return { error: "확정된 예약만 완료 처리할 수 있습니다." };
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from("bookings")
    .update({ status: "COMPLETED" })
    .eq("id", bookingId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };

  // 고객 방문 이력 갱신
  if (booking.customer_id) {
    const { data: customer } = await admin
      .from("customers")
      .select("visit_count, first_visit_at")
      .eq("id", booking.customer_id)
      .maybeSingle();

    if (customer) {
      await admin
        .from("customers")
        .update({
          visit_count: (customer.visit_count ?? 0) + 1,
          first_visit_at: customer.first_visit_at ?? now,
          last_visit_at: now,
        })
        .eq("id", booking.customer_id);
    }
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/customers");
  return {};
}

export async function noShowBooking(bookingId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("bookings")
    .update({ status: "NO_SHOW" })
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .eq("status", "CONFIRMED");

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bookings");
  return {};
}
