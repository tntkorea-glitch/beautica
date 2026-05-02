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
}
