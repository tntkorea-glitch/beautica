"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyBookingConfirmed, notifyBookingCancelled } from "@/lib/notify";
import { formatKSTMonthDayWeekdayTime } from "@/lib/format";

type Result = { error?: string };
type ConvertResult = {
  error?: string;
  customerId?: string;
  matchedExisting?: boolean;
  existingCustomerName?: string;
};

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

  // Fetch booking details for notification before updating
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "start_at, guest_name, guest_phone, customer:customers(name, phone), service:services(name)",
    )
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .eq("status", "PENDING")
    .maybeSingle();

  const { error } = await admin
    .from("bookings")
    .update({ status: "CONFIRMED", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .eq("status", "PENDING");

  if (error) return { error: error.message };

  // Send 알림톡 (silently skips if env vars missing or notify disabled)
  if (booking && shop.kakao_notify_enabled && shop.notification_phone) {
    const b = booking as unknown as {
      start_at: string;
      guest_name: string | null;
      guest_phone: string | null;
      customer: { name: string; phone: string | null } | null;
      service: { name: string } | null;
    };
    const phone = b.customer?.phone ?? b.guest_phone;
    const name = b.customer?.name ?? b.guest_name ?? "고객";
    if (phone) {
      void notifyBookingConfirmed({
        phone,
        senderPhone: shop.notification_phone,
        customerName: name,
        shopName: shop.name ?? "매장",
        serviceName: b.service?.name ?? "시술",
        dateTime: formatKSTMonthDayWeekdayTime(b.start_at),
      });
    }
  }

  revalidatePath("/dashboard/bookings");
  return {};
}

export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("start_at, guest_name, guest_phone, customer:customers(name, phone)")
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .in("status", ["PENDING", "CONFIRMED"])
    .maybeSingle();

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

  if (booking && shop.kakao_notify_enabled && shop.notification_phone) {
    const b = booking as unknown as {
      start_at: string;
      guest_name: string | null;
      guest_phone: string | null;
      customer: { name: string; phone: string | null } | null;
    };
    const phone = b.customer?.phone ?? b.guest_phone;
    const name = b.customer?.name ?? b.guest_name ?? "고객";
    if (phone) {
      void notifyBookingCancelled({
        phone,
        senderPhone: shop.notification_phone,
        customerName: name,
        shopName: shop.name ?? "매장",
        dateTime: formatKSTMonthDayWeekdayTime(b.start_at),
      });
    }
  }

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

/**
 * 게스트 예약 → 고객 카드 변환.
 *   1. (shop_id, phone) 으로 기존 customer 조회 — 있으면 매핑만
 *   2. 없으면 신규 customer INSERT
 *   3. booking 의 customer_id 매핑 + guest_name/guest_phone 정리
 *   4. linkOtherGuestBookings=true 면 같은 phone 으로 잡힌 다른 게스트 예약도 일괄 매핑
 */
export async function convertGuestToCustomer(input: {
  bookingId: string;
  name: string;
  phone: string;
  email?: string | null;
  linkOtherGuestBookings?: boolean;
}): Promise<ConvertResult> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim() || null;

  if (!name) return { error: "이름을 입력해주세요." };
  if (!phone) return { error: "휴대폰 번호를 입력해주세요." };

  const { data: booking } = await admin
    .from("bookings")
    .select("id, shop_id, customer_id")
    .eq("id", input.bookingId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!booking) return { error: "예약을 찾을 수 없습니다." };
  if (booking.customer_id) return { error: "이미 고객 카드가 연결된 예약입니다." };

  // 1. 기존 customer 조회 (같은 매장 + phone)
  //    DB 에 저장된 phone 형식이 매장마다 다를 수 있어서 (raw 11자리 / 하이픈 포함)
  //    입력 phone 을 그대로 + 숫자만 추출한 변형 둘 다로 비교
  const phoneDigits = phone.replace(/\D/g, "");
  const { data: existingList } = await admin
    .from("customers")
    .select("id, name, phone")
    .eq("shop_id", shop.id)
    .or(`phone.eq.${phone},phone.eq.${phoneDigits}`);
  const existing =
    (existingList ?? []).find(
      (c) => (c.phone as string | null)?.replace(/\D/g, "") === phoneDigits,
    ) ?? null;

  let customerId: string;
  let matchedExisting = false;
  let existingCustomerName: string | undefined;

  if (existing) {
    customerId = existing.id as string;
    matchedExisting = true;
    existingCustomerName = existing.name as string;
  } else {
    const { data: created, error: insErr } = await admin
      .from("customers")
      .insert({ shop_id: shop.id, name, phone, email })
      .select("id")
      .single();
    if (insErr || !created) {
      return { error: insErr?.message ?? "고객 생성 실패" };
    }
    customerId = created.id as string;
  }

  // 2. booking 매핑 + guest 필드 정리
  const { error: updErr } = await admin
    .from("bookings")
    .update({
      customer_id: customerId,
      guest_name: null,
      guest_phone: null,
    })
    .eq("id", input.bookingId)
    .eq("shop_id", shop.id);

  if (updErr) return { error: updErr.message };

  // 3. 같은 phone 으로 잡힌 다른 게스트 예약 일괄 매핑
  if (input.linkOtherGuestBookings) {
    await admin
      .from("bookings")
      .update({
        customer_id: customerId,
        guest_name: null,
        guest_phone: null,
      })
      .eq("shop_id", shop.id)
      .is("customer_id", null)
      .eq("guest_phone", phone);
  }

  revalidatePath(`/dashboard/bookings/${input.bookingId}`);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/customers");

  return { customerId, matchedExisting, existingCustomerName };
}

export async function rescheduleBooking(
  bookingId: string,
  newStartAt: string,
  newEndAt: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const start = new Date(newStartAt);
  const end = new Date(newEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "날짜 형식이 올바르지 않습니다." };
  }
  if (end <= start) return { error: "종료 시간은 시작 시간보다 이후여야 합니다." };

  const { error } = await admin
    .from("bookings")
    .update({
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    })
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .in("status", ["PENDING", "CONFIRMED"]);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  revalidatePath("/dashboard/bookings");
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
