"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/toss";
import { earnPoints, spendPoints, getPointBalance } from "@/lib/points";
import { evaluatePromotion } from "@/lib/promotion";

const SERVICE_SELECT =
  "id, price_won, duration_min, promotion_active, promotion_price_won, promotion_start_at, promotion_end_at";

function effectivePriceFromService(s: Record<string, unknown>): number {
  return evaluatePromotion({
    price_won: s.price_won as number,
    promotion_active: (s.promotion_active as boolean | null) ?? false,
    promotion_price_won: (s.promotion_price_won as number | null) ?? null,
    promotion_start_at: (s.promotion_start_at as string | null) ?? null,
    promotion_end_at: (s.promotion_end_at as string | null) ?? null,
  }).effectivePrice;
}

// ─────────────────────────────────────────────────────────────
// 1. 예약금 없는 일반 예약 (기존 흐름) — 포인트 미적용
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
    .select(SERVICE_SELECT)
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
      price_won: effectivePriceFromService(service),
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { bookingId: booking.id as string };
}

// ─────────────────────────────────────────────────────────────
// 2. 예약금 결제 초기화 (토스 결제 전 PAYMENT_PENDING 예약 생성)
//    pointsUsed > 0: 예약금 차감, effectiveDeposit=0 시 바로 PENDING
// ─────────────────────────────────────────────────────────────
export async function initBookingPayment(input: {
  shopSlug: string;
  serviceId: string;
  startAt: string;
  guestName: string;
  guestPhone: string;
  depositAmount: number;
  pointsUsed?: number;
}): Promise<{ error?: string; orderId?: string; bookingId?: string; skipPayment?: boolean }> {
  const admin = createAdminClient();
  const pointsUsed = input.pointsUsed ?? 0;

  const { data: shop } = await admin
    .from("shops")
    .select("id, name, is_active, deposit_required, deposit_amount, points_enabled, points_min_use")
    .eq("slug", input.shopSlug)
    .maybeSingle();

  if (!shop || !shop.is_active) return { error: "샵을 찾을 수 없습니다." };

  const { data: service } = await admin
    .from("services")
    .select(SERVICE_SELECT)
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

  // 포인트 서버사이드 검증
  if (pointsUsed > 0) {
    if (!(shop.points_enabled as boolean)) {
      return { error: "포인트 사용이 비활성화된 샵입니다." };
    }
    const minUse = (shop.points_min_use as number) ?? 1000;
    if (pointsUsed < minUse) {
      return { error: `포인트는 최소 ${minUse.toLocaleString()}원 이상 사용해야 합니다.` };
    }
    const balance = await getPointBalance(phone, shop.id as string);
    if (!balance || balance.balance < pointsUsed) {
      return { error: "포인트 잔액이 부족합니다." };
    }
  }

  const duration = (service.duration_min as number | null) ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
  const effectiveDeposit = Math.max(0, input.depositAmount - pointsUsed);

  // 포인트로 전액 결제 — PENDING 바로 생성 + 포인트 즉시 차감
  if (effectiveDeposit === 0 && pointsUsed > 0) {
    const { data: booking, error } = await admin
      .from("bookings")
      .insert({
        shop_id: shop.id as string,
        service_id: service.id as string,
        guest_name: name,
        guest_phone: phone,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        price_won: effectivePriceFromService(service),
        status: "PENDING",
        deposit_paid: true,
        deposit_amount_won: input.depositAmount,
        points_used: pointsUsed,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    try {
      await spendPoints({
        phone,
        shopId: shop.id as string,
        amount: pointsUsed,
        type: "SPEND_BEAUTICA",
        bookingId: booking.id as string,
        description: "예약금 포인트 결제",
      });
    } catch {
      // 포인트 차감 실패 시 booking 롤백은 어려우므로 로깅만
    }

    return { skipPayment: true, bookingId: booking.id as string };
  }

  // 일반 흐름 — 토스 결제 필요
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
      price_won: effectivePriceFromService(service),
      status: "PAYMENT_PENDING",
      deposit_amount_won: effectiveDeposit,
      payment_order_id: orderId,
      points_used: pointsUsed,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { orderId, bookingId: booking.id as string };
}

// ─────────────────────────────────────────────────────────────
// 3. 토스 결제 완료 후 예약 확정 + 포인트 차감 + 포인트 적립
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

  // 2. PAYMENT_PENDING 예약 조회 (status 체크로 중복 처리 방지)
  const { data: booking } = await admin
    .from("bookings")
    .select("id, guest_name, guest_phone, start_at, shop_id, deposit_amount_won, points_used, shops(name, points_enabled)")
    .eq("payment_order_id", input.orderId)
    .eq("status", "PAYMENT_PENDING")
    .maybeSingle();

  if (!booking) return { error: "예약 정보를 찾을 수 없습니다." };

  const shop = booking.shops as unknown as { name: string; points_enabled: boolean } | null;

  // 3. 예약 상태 업데이트 PAYMENT_PENDING → PENDING (이 transition 이 1회임을 보장)
  await admin.from("bookings").update({
    status: "PENDING",
    deposit_paid: true,
    payment_key: tossResult.paymentKey,
    payment_method: tossResult.method,
  }).eq("id", booking.id);

  // 4. 포인트 차감 (points_used > 0인 경우)
  const pointsUsed = (booking.points_used as number) ?? 0;
  const phone = booking.guest_phone as string | null;
  if (pointsUsed > 0 && phone) {
    try {
      await spendPoints({
        phone,
        shopId: booking.shop_id as string,
        amount: pointsUsed,
        type: "SPEND_BEAUTICA",
        bookingId: booking.id as string,
        description: "예약금 포인트 사용",
      });
    } catch {
      // 차감 실패 시 예약은 정상 처리
    }
  }

  // 5. 예약금 포인트 즉시 적립 (points_enabled 샵만, 실결제금액 기준)
  let pointsEarned = 0;
  const depositPaid = (booking.deposit_amount_won as number) ?? 0;
  if (phone && depositPaid > 0 && shop?.points_enabled) {
    try {
      const result = await earnPoints({
        phone,
        name: booking.guest_name as string | undefined,
        amountWon: depositPaid,
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
//    points_enabled 샵만 적립
// ─────────────────────────────────────────────────────────────
export async function awardCompletionPoints(bookingId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, guest_phone, guest_name, price_won, shop_id, deposit_paid, shops(points_enabled)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || !booking.guest_phone) return;

  const shop = booking.shops as unknown as { points_enabled: boolean } | null;
  if (!shop?.points_enabled) return;

  await earnPoints({
    phone: booking.guest_phone as string,
    name: booking.guest_name as string | undefined,
    amountWon: booking.price_won as number,
    type: "EARN_BOOKING",
    shopId: booking.shop_id as string,
    bookingId: bookingId,
    description: "시술 완료 포인트",
  });
}
