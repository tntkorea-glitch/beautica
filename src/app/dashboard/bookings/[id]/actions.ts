"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChartField } from "@/lib/consultation-templates";

type Result = { error?: string };

/**
 * 상담차트 저장 (예약과 연결).
 * fields 는 동적 템플릿이라 JSON 으로 받아서 known 컬럼 + notes 필드에 매핑.
 */
export async function saveConsultationChart(
  bookingId: string,
  customerId: string,
  templateKey: string,
  values: Record<string, string>,
  fields: ChartField[],
): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  // booking 검증
  const { data: booking } = await admin
    .from("bookings")
    .select("id, customer_id, staff_id")
    .eq("id", bookingId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!booking) return { error: "예약을 찾을 수 없습니다." };

  // 알려진 컬럼 매핑
  const knownKeys = new Set([
    "skin_type",
    "allergies",
    "medical_history",
    "medications",
    "previous_treatments",
    "desired_design",
    "shop_assessment",
    "notes",
  ]);

  const knownValues: Record<string, string | null> = {};
  const extraValues: Record<string, string> = {};

  for (const field of fields) {
    const v = values[field.key]?.trim();
    if (!v) continue;
    if (knownKeys.has(field.key)) {
      knownValues[field.key] = v;
    } else {
      extraValues[`${field.label}`] = v;
    }
  }

  // extra (시술별 특화 필드) 는 notes 또는 별도 영역에 합쳐서 저장
  const extraText = Object.entries(extraValues)
    .map(([k, v]) => `[${k}] ${v}`)
    .join("\n");
  const combinedNotes = [knownValues.notes, extraText && `--- 시술 특화 정보 ---\n${extraText}`]
    .filter(Boolean)
    .join("\n\n");

  // 같은 booking 의 기존 차트 확인 (있으면 update, 없으면 insert — upsert)
  const { data: existing } = await admin
    .from("consultation_charts")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("shop_id", shop.id)
    .maybeSingle();

  const payload = {
    shop_id: shop.id,
    customer_id: customerId,
    booking_id: bookingId,
    staff_id: booking.staff_id,
    visit_at: new Date().toISOString(),
    skin_type: knownValues.skin_type ?? null,
    allergies: knownValues.allergies ?? null,
    medical_history: knownValues.medical_history ?? null,
    medications: knownValues.medications ?? null,
    previous_treatments: knownValues.previous_treatments ?? null,
    desired_design: knownValues.desired_design ?? null,
    shop_assessment: knownValues.shop_assessment ?? null,
    notes: combinedNotes || null,
  };

  if (existing) {
    const { error } = await admin
      .from("consultation_charts")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("consultation_charts").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath(`/dashboard/bookings/${bookingId}`);
  // 매장 메타 (어떤 템플릿 사용했는지) 는 추후 확장 시 필드 추가
  void templateKey;
  return {};
}
