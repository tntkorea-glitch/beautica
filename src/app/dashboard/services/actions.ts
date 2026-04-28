"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

function parseFields(formData: FormData): Result & {
  name?: string;
  category?: string | null;
  price_won?: number;
  duration_min?: number;
  description?: string | null;
  is_active?: boolean;
  display_order?: number;
} {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const priceStr = String(formData.get("price_won") ?? "").replace(/\D/g, "");
  const durationStr = String(formData.get("duration_min") ?? "").replace(/\D/g, "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "on";
  const displayStr = String(formData.get("display_order") ?? "0").replace(/\D/g, "");

  if (!name) return { error: "시술명을 입력해주세요." };
  if (!priceStr) return { error: "가격을 입력해주세요." };
  const price_won = Number(priceStr);
  if (price_won < 0) return { error: "가격은 0 이상이어야 합니다." };
  const duration_min = Number(durationStr) || 60;
  const display_order = Number(displayStr) || 0;

  return { name, category, price_won, duration_min, description, is_active, display_order };
}

export async function createService(formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if (parsed.error) return parsed;

  const admin = createAdminClient();
  const { error } = await admin.from("services").insert({
    shop_id: shop.id,
    name: parsed.name,
    category: parsed.category,
    price_won: parsed.price_won,
    duration_min: parsed.duration_min,
    description: parsed.description,
    is_active: parsed.is_active,
    display_order: parsed.display_order,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function updateService(
  serviceId: string,
  formData: FormData,
): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if (parsed.error) return parsed;

  const admin = createAdminClient();
  const { error } = await admin
    .from("services")
    .update({
      name: parsed.name,
      category: parsed.category,
      price_won: parsed.price_won,
      duration_min: parsed.duration_min,
      description: parsed.description,
      is_active: parsed.is_active,
      display_order: parsed.display_order,
    })
    .eq("id", serviceId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function deleteService(serviceId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function toggleActive(serviceId: string, nextActive: boolean) {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  await admin
    .from("services")
    .update({ is_active: nextActive })
    .eq("id", serviceId)
    .eq("shop_id", shop.id);
  revalidatePath("/dashboard/services");
}
