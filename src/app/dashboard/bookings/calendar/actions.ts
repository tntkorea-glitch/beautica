"use server";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createPersonalEvent(data: {
  title: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  color?: string;
  note?: string;
}) {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin.from("personal_events").insert({
    shop_id: shop.id,
    title: data.title,
    start_at: data.start_at,
    end_at: data.end_at,
    all_day: data.all_day ?? false,
    color: data.color ?? "#9ca3af",
    note: data.note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/bookings/calendar");
  revalidatePath("/dashboard");
}

export async function deletePersonalEvent(id: string) {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("personal_events")
    .delete()
    .eq("id", id)
    .eq("shop_id", shop.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/bookings/calendar");
  revalidatePath("/dashboard");
}

/** 캘린더 모달용 — redirect 없이 결과 반환. createBooking과 분리. */
export async function createBookingFromCalendar(input: {
  customer_id: string | null;
  service_id: string;
  staff_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  start_at: string; // ISO
  price_won: number | null;
  shop_note: string | null;
}): Promise<{ error?: string }> {
  const { shop } = await requireShop();
  const admin = createAdminClient();

  if (!input.start_at) return { error: "시작 시간을 선택해주세요." };
  if (!input.customer_id && !input.guest_name) {
    return { error: "기존 고객을 선택하거나 게스트 이름을 입력해주세요." };
  }
  if (!input.service_id) return { error: "시술 메뉴를 선택해주세요." };

  const { data: service } = await admin
    .from("services")
    .select("price_won, duration_min")
    .eq("id", input.service_id)
    .eq("shop_id", shop.id)
    .maybeSingle();

  if (!service) return { error: "선택한 시술 메뉴를 찾을 수 없습니다." };

  const startAt = new Date(input.start_at);
  if (Number.isNaN(startAt.getTime())) return { error: "시작 시간이 올바르지 않습니다." };

  const duration = service.duration_min ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
  const priceWon = input.price_won ?? Number(service.price_won);

  const { error } = await admin.from("bookings").insert({
    shop_id: shop.id,
    customer_id: input.customer_id,
    service_id: input.service_id,
    staff_id: input.staff_id,
    guest_name: input.customer_id ? null : input.guest_name,
    guest_phone: input.customer_id ? null : input.guest_phone,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    price_won: priceWon,
    shop_note: input.shop_note,
    status: "CONFIRMED",
    confirmed_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/bookings/calendar");
  return {};
}
