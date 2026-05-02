"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

// ── 네이버 예약 연동 ──────────────────────────────────
export async function updateNaverBooking(
  enabled: boolean,
  businessId: string,
  placeUrl: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

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

// ── 매장 기본 정보 ────────────────────────────────────
export async function updateShopInfo(formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "매장명을 입력해주세요." };

  const { error } = await admin
    .from("shops")
    .update({ name: name || null, phone: phone || null, address: address || null, description: description || null })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return {};
}

// ── 예약금 설정 ───────────────────────────────────────
export async function updateDepositSettings(params: {
  required: boolean;
  amount: number;
  type: "FIXED" | "PERCENT";
  percent: number;
  waitMin: number;
  cancelMin: number;
  memberExcept: boolean;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { required, amount, type, percent, waitMin, cancelMin, memberExcept } = params;

  if (required && type === "FIXED" && (amount < 0 || amount > 500000)) {
    return { error: "예약금은 0~500,000원 사이로 입력해주세요." };
  }
  if (required && type === "PERCENT" && (percent < 1 || percent > 100)) {
    return { error: "비율은 1~100% 사이로 입력해주세요." };
  }

  const { error } = await admin
    .from("shops")
    .update({
      deposit_required: required,
      deposit_amount: type === "FIXED" ? amount : 0,
      deposit_type: type,
      deposit_percent: type === "PERCENT" ? percent : 0,
      deposit_wait_min: waitMin,
      deposit_cancel_min: cancelMin,
      deposit_member_except: memberExcept,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── 시술 후 알림 설정 ─────────────────────────────────
export async function updatePostNotifySettings(
  enabled: boolean,
  delayH: number,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { error } = await admin
    .from("shops")
    .update({ post_notify_enabled: enabled, post_notify_delay_h: delayH })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── 운영 시간 ─────────────────────────────────────────
type DayHours = { open: string; close: string; closed: boolean };
type BusinessHours = Record<string, DayHours>;

export async function updateBusinessHours(hours: BusinessHours): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { error } = await admin
    .from("shops")
    .update({ business_hours: hours })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── 알림톡 설정 ───────────────────────────────────────
export async function updateNotificationSettings(
  enabled: boolean,
  phone: string,
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { error } = await admin
    .from("shops")
    .update({
      kakao_notify_enabled: enabled,
      notification_phone: phone.trim() || null,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── Solapi 알림톡 API 연동 ─────────────────────────────
export async function updateSolapiSettings(params: {
  apiKey: string;
  apiSecret: string;
  pfId: string;
  templateConfirmed: string;
  templateCancelled: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const { error } = await admin
    .from("shops")
    .update({
      solapi_api_key: params.apiKey.trim() || null,
      solapi_api_secret: params.apiSecret.trim() || null,
      solapi_pfid: params.pfId.trim() || null,
      solapi_template_confirmed: params.templateConfirmed.trim() || null,
      solapi_template_cancelled: params.templateCancelled.trim() || null,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── D-1 리마인더 설정 ─────────────────────────────────
export async function updateReminderSettings(params: {
  enabled: boolean;
  hoursBefore: number;
  templateReminder: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const hoursBefore = Math.max(1, Math.min(168, params.hoursBefore));

  const { error } = await admin
    .from("shops")
    .update({
      reminder_enabled: params.enabled,
      reminder_hours_before: hoursBefore,
      solapi_template_reminder: params.templateReminder.trim() || null,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}

// ── 무통장입금 계좌 정보 ──────────────────────────────
export async function updateBankAccount(input: {
  code: string;
  accountNo: string;
  holder: string;
}): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  const bankName = ({
    kb: "국민은행", shinhan: "신한은행", woori: "우리은행", hana: "하나은행",
    nh: "NH농협", ibk: "IBK기업은행", kakao: "카카오뱅크", toss: "토스뱅크",
    k: "케이뱅크", saemaul: "새마을금고", busan: "부산은행", daegu: "대구은행",
  } as Record<string, string>)[input.code] ?? null;

  const { error } = await admin
    .from("shops")
    .update({
      bank_code: input.code || null,
      bank_name: bankName,
      bank_account_no: input.accountNo || null,
      bank_holder: input.holder || null,
    })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return {};
}
