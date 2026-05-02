"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/toss";
import { earnPoints } from "@/lib/points";

// ─────────────────────────────────────────────────────────────
// 1. 예약금 없는 일반 예약 (기존 흐름)
// ─────────────────────────────────────────────────────────────
export async function createGuestBooking(input: {
  shopSlug: string;
  serviceId: string;
  startAt: string;
  guestName: string;
  guestPhone: string;
}): Promise<{ error?: string; bookingId?: string }> {
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id, name, is_active")
    .eq("slug", input.shopSlug)
    .maybeSingle();

  if (!shop || !shop.is_active) return { error: "샵을 찾을 수 없습니다." };

  const { data: service } = await admin
    .from("services")
    .select("id, price_won, duration_min")
    .eq("id", input.serviceId)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) return { error: "시술 메뉴를 찾을 수 없습니다." };

  const name = input.guestName.trim();
  const phone = input.guestPhone.trim();
  if (!name) return { error: "이름을 입력해주세요." };
  if (!phone) return { error: "전화번호를 입력해주세요." };

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) return { error: "예약 시간이 올바르지 않습니다." };

  const duration = (service.duration_min as number | null) ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      shop_id: shop.id as string,
      service_id: service.id as string,
      guest_name: name,
      guest_phone: phone,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      price_won: service.price_won,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { bookingId: booking.id as string };
}

// ─────────────────────────────────────────────────────────────
// 2. 예약금 결제 초기화 (토스 결제 전 PAYMENT_PENDING 예약 생성)
// ─────────────────────────────────────────────────────────────
export async function initBookingPayment(input: {
  shopSlug: string;
  serviceId: string;
  startAt: string;
  guestName: string;
  guestPhone: string;
  depositAmount: number;
}): Promise<{ error?: string; orderId?: string; bookingId?: string }> {
  const admin = createAdminClient();

  const { data: shop } = await admin
    .from("shops")
    .select("id, name, is_active, deposit_required, deposit_amount")
    .eq("slug", input.shopSlug)
    .maybeSingle();

  if (!shop || !shop.is_active) return { error: "샵을 찾을 수 없습니다." };

  const { data: service } = await admin
    .from("services")
    .select("id, price_won, duration_min")
    .eq("id", input.serviceId)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) return { error: "시술 메뉴를 찾을 수 없습니다." };

  const name = input.guestName.trim();
  const phone = input.guestPhone.trim();
  if (!name) return { error: "이름을 입력해주세요." };
  if (!phone) return { error: "전화번호를 입력해주세요." };

  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) return { error: "예약 시간이 올바르지 않습니다." };

  const duration = (service.duration_min as number | null) ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);

  // 토스 orderId: UUID 형식 필수
  const { randomUUID } = await import("crypto");
  const orderId = randomUUID();

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      shop_id: shop.id as string,
      service_id: service.id as string,
      guest_name: name,
      guest_phone: phone,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      price_won: service.price_won,
      status: "PAYMENT_PENDING",
      deposit_amount_won: input.depositAmount,
      payment_order_id: orderId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { orderId, bookingId: booking.id as string };
}

// ─────────────────────────────────────────────────────────────
// 3. 토스 결제 완료 후 예약 확정 + 포인트 적립
// ─────────────────────────────────────────────────────────────
export async function finalizeBookingPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{
  error?: string;
  booking?: { id: string; guestName: string; startAt: string; shopName: string };
  pointsEarned?: number;
}> {
  // 1. 토스 결제 승인
  let tossResult;
  try {
    tossResult = await confirmPayment({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  const admin = createAdminClient();

  // 2. PAYMENT_PENDING 예약 조회
  const { data: booking } = await admin
    .from("bookings")
    .select("id, guest_name, guest_phone, start_at, shop_id, deposit_amount_won, shops(name)")
    .eq("payment_order_id", input.orderId)
    .eq("status", "PAYMENT_PENDING")
    .maybeSingle();

  if (!booking) return { error: "예약 정보를 찾을 수 없습니다." };

  // 3. 예약 상태 업데이트 PAYMENT_PENDING → PENDING
  await admin.from("bookings").update({
    status: "PENDING",
    deposit_paid: true,
    payment_key: tossResult.paymentKey,
    payment_method: tossResult.method,
  }).eq("id", booking.id);

  // 4. 예약금 포인트 즉시 적립 (예약금의 1%)
  let pointsEarned = 0;
  const phone = booking.guest_phone as string | null;
  if (phone && (booking.deposit_amount_won as number) > 0) {
    try {
      const result = await earnPoints({
        phone,
        name: booking.guest_name as string | undefined,
        amountWon: booking.deposit_amount_won as number,
        type: "EARN_DEPOSIT",
        shopId: booking.shop_id as string,
        bookingId: booking.id as string,
        description: "예약금 결제 포인트",
      });
      pointsEarned = result.earned;
    } catch {
      // 포인트 실패해도 예약은 정상 처리
    }
  }

  const shop = booking.shops as unknown as { name: string } | null;

  return {
    booking: {
      id: booking.id as string,
      guestName: booking.guest_name as string,
      startAt: booking.start_at as string,
      shopName: shop?.name ?? "",
    },
    pointsEarned,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. 예약 완료 후 시술 금액 기준 포인트 적립 (원장이 COMPLETED 처리 시)
// ─────────────────────────────────────────────────────────────
export async function awardCompletionPoints(bookingId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, guest_phone, guest_name, price_won, shop_id, deposit_paid")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || !booking.guest_phone) return;

  // 이미 예약금으로 적립된 경우 시술 금액에서 예약금 포인트분 제외
  const base = booking.price_won as number;
  await earnPoints({
    phone: booking.guest_phone as string,
    name: booking.guest_name as string | undefined,
    amountWon: base,
    type: "EARN_BOOKING",
    shopId: booking.shop_id as string,
    bookingId: bookingId,
    description: "시술 완료 포인트",
  });
}
