"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { cancelPayment } from "@/lib/toss";
import { refundBookingPoints } from "@/lib/points";
import { notifyBookingCancelled, type SolapiCreds } from "@/lib/notify";
import { formatKSTMonthDayWeekdayTime } from "@/lib/format";

export type CustomerBooking = {
  id: string;
  start_at: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  service_name: string;
  price_won: number;
  deposit_paid: boolean;
  deposit_amount_won: number;
  payment_key: string | null;
  points_used: number;
};

type ShopForCustomer = {
  id: string;
  name: string;
  deposit_cancel_min: number;
  kakao_notify_enabled: boolean;
  notification_phone: string | null;
  solapi_api_key: string | null;
  solapi_api_secret: string | null;
  solapi_pfid: string | null;
  solapi_template_cancelled: string | null;
};

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `0${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  return phone.trim();
}

export async function lookupBookings(
  shopSlug: string,
  phone: string,
): Promise<{ error?: string; bookings?: CustomerBooking[]; shopName?: string }> {
  const admin = createAdminClient();
  const normalized = normalizePhone(phone);
  const digits = phone.replace(/\D/g, "");

  const { data: shop } = await admin
    .from("shops")
    .select("id, name")
    .eq("slug", shopSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!shop) return { error: "매장을 찾을 수 없습니다." };

  // 게스트 예약 (guest_phone 매칭)
  const phoneVariants = [normalized, digits];
  const { data: guestBookings } = await admin
    .from("bookings")
    .select(
      "id, start_at, status, price_won, deposit_paid, deposit_amount_won, payment_key, points_used, service:services(name)",
    )
    .eq("shop_id", shop.id)
    .in("status", ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"])
    .or(phoneVariants.map((p) => `guest_phone.eq.${p}`).join(","))
    .order("start_at", { ascending: false })
    .limit(20);

  // 고객 카드 예약 (customer.phone 매칭)
  const { data: customerRow } = await admin
    .from("customers")
    .select("id")
    .eq("shop_id", shop.id)
    .or(phoneVariants.map((p) => `phone.eq.${p}`).join(","))
    .maybeSingle();

  let customerBookings: typeof guestBookings = [];
  if (customerRow) {
    const { data } = await admin
      .from("bookings")
      .select(
        "id, start_at, status, price_won, deposit_paid, deposit_amount_won, payment_key, points_used, service:services(name)",
      )
      .eq("shop_id", shop.id)
      .eq("customer_id", customerRow.id)
      .in("status", ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"])
      .order("start_at", { ascending: false })
      .limit(20);
    customerBookings = data ?? [];
  }

  // 중복 제거 + 정렬
  const seen = new Set<string>();
  const all: CustomerBooking[] = [];
  for (const row of [...(guestBookings ?? []), ...customerBookings]) {
    if (seen.has(row.id as string)) continue;
    seen.add(row.id as string);
    const svc = row.service as unknown as { name: string } | null;
    all.push({
      id: row.id as string,
      start_at: row.start_at as string,
      status: row.status as CustomerBooking["status"],
      service_name: svc?.name ?? "(시술 없음)",
      price_won: (row.price_won as number) ?? 0,
      deposit_paid: (row.deposit_paid as boolean) ?? false,
      deposit_amount_won: (row.deposit_amount_won as number) ?? 0,
      payment_key: (row.payment_key as string | null) ?? null,
      points_used: (row.points_used as number) ?? 0,
    });
  }
  all.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());

  return { bookings: all.slice(0, 20), shopName: shop.name as string };
}

export async function customerCancelBooking(input: {
  bookingId: string;
  phone: string;
  shopSlug: string;
}): Promise<{ error?: string; refunded?: boolean; refundAmount?: number; noRefundReason?: string }> {
  const admin = createAdminClient();
  const normalized = normalizePhone(input.phone);
  const digits = input.phone.replace(/\D/g, "");

  const { data: shop } = await admin
    .from("shops")
    .select(
      "id, name, deposit_cancel_min, kakao_notify_enabled, notification_phone, solapi_api_key, solapi_api_secret, solapi_pfid, solapi_template_cancelled",
    )
    .eq("slug", input.shopSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!shop) return { error: "매장을 찾을 수 없습니다." };
  const s = shop as unknown as ShopForCustomer;

  // 예약 조회 — 전화번호 소유 확인 포함
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, start_at, status, guest_name, guest_phone, deposit_paid, deposit_amount_won, payment_key, points_used, customer:customers(name, phone)",
    )
    .eq("id", input.bookingId)
    .eq("shop_id", s.id)
    .in("status", ["PENDING", "CONFIRMED"])
    .maybeSingle();

  if (!booking) return { error: "취소할 수 없는 예약입니다." };

  const bk = booking as unknown as {
    start_at: string;
    guest_name: string | null;
    guest_phone: string | null;
    deposit_paid: boolean;
    deposit_amount_won: number | null;
    payment_key: string | null;
    points_used: number;
    customer: { name: string; phone: string | null } | null;
  };

  // 본인 확인 (입력 전화번호 == 예약 전화번호)
  const bookingPhone = (bk.customer?.phone ?? bk.guest_phone ?? "").replace(/\D/g, "");
  if (bookingPhone !== digits) {
    return { error: "예약 정보와 일치하지 않는 전화번호입니다." };
  }

  // 취소 가능 시간 체크
  const minutesUntil = (new Date(bk.start_at).getTime() - Date.now()) / (1000 * 60);
  const cancelMinThreshold = (s.deposit_cancel_min as number) ?? 1440;
  const withinNoRefundWindow = minutesUntil < cancelMinThreshold;

  const phone = bk.customer?.phone ?? bk.guest_phone ?? "";
  const depositAmount = bk.deposit_amount_won ?? 0;

  // 환불 처리 (취소 가능 시간 밖에서 취소 시에만)
  let refunded = false;
  let noRefundReason: string | undefined;

  if (!withinNoRefundWindow && bk.deposit_paid && bk.payment_key) {
    try {
      await cancelPayment({
        paymentKey: bk.payment_key,
        cancelReason: "고객 예약 취소",
      });
      refunded = true;
    } catch (err) {
      return { error: `결제 취소 실패: ${(err as Error).message}` };
    }
  } else if (withinNoRefundWindow && bk.deposit_paid) {
    const hours = Math.round(cancelMinThreshold / 60);
    noRefundReason = `방문 ${hours}시간 이내 취소로 예약금은 환불되지 않습니다.`;
  }

  // 포인트 복원 (취소 창 여부와 무관하게 포인트는 정산)
  if (phone) {
    try {
      await refundBookingPoints({
        phone,
        shopId: s.id,
        bookingId: input.bookingId,
        pointsUsed: bk.points_used ?? 0,
      });
    } catch { /* 포인트 복원 실패해도 취소 진행 */ }
  }

  // 상태 업데이트
  const { error } = await admin
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "고객 직접 취소",
    })
    .eq("id", input.bookingId)
    .eq("shop_id", s.id);

  if (error) return { error: error.message };

  // 알림톡
  if (phone && s.kakao_notify_enabled && s.notification_phone) {
    const name = bk.customer?.name ?? bk.guest_name ?? "고객";
    const creds: SolapiCreds | undefined =
      s.solapi_api_key && s.solapi_api_secret
        ? {
            apiKey: s.solapi_api_key,
            apiSecret: s.solapi_api_secret,
            pfId: s.solapi_pfid ?? "",
            templateCancelled: s.solapi_template_cancelled ?? undefined,
          }
        : undefined;
    void notifyBookingCancelled({
      phone,
      senderPhone: s.notification_phone,
      customerName: name,
      shopName: s.name,
      dateTime: formatKSTMonthDayWeekdayTime(bk.start_at),
      creds,
    });
  }

  return { refunded, refundAmount: refunded ? depositAmount : 0, noRefundReason };
}
