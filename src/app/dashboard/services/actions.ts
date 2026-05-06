"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

type ParsedFields = {
  name: string;
  category: string | null;
  price_won: number;
  duration_min: number;
  description: string | null;
  is_active: boolean;
  display_order: number;
  photo_url: string | null;
  price_note: string | null;
  promotion_active: boolean;
  promotion_price_won: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
};

function parseFields(formData: FormData): { error?: string; fields?: ParsedFields } {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const priceStr = String(formData.get("price_won") ?? "").replace(/\D/g, "");
  const durationStr = String(formData.get("duration_min") ?? "").replace(/\D/g, "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const is_active = formData.get("is_active") === "on";
  const displayStr = String(formData.get("display_order") ?? "0").replace(/\D/g, "");
  const photo_url = String(formData.get("photo_url") ?? "").trim() || null;

  const price_note = String(formData.get("price_note") ?? "").trim() || null;
  const promotion_active = formData.get("promotion_active") === "on";
  const promoPriceStr = String(formData.get("promotion_price_won") ?? "").replace(/\D/g, "");
  const promotion_start_at = String(formData.get("promotion_start_at") ?? "").trim() || null;
  const promotion_end_at = String(formData.get("promotion_end_at") ?? "").trim() || null;

  if (!name) return { error: "시술명을 입력해주세요." };
  if (!priceStr) return { error: "정가를 입력해주세요." };
  const price_won = Number(priceStr);
  if (price_won < 0) return { error: "가격은 0 이상이어야 합니다." };
  const duration_min = Number(durationStr) || 60;
  const display_order = Number(displayStr) || 0;

  let promotion_price_won: number | null = null;
  if (promotion_active) {
    if (!promoPriceStr) return { error: "프로모션 가격을 입력해주세요." };
    promotion_price_won = Number(promoPriceStr);
    if (promotion_price_won < 0) return { error: "프로모션 가격은 0 이상이어야 합니다." };
    if (promotion_price_won >= price_won)
      return { error: "프로모션 가격은 정가보다 낮아야 합니다." };
    if (promotion_start_at && promotion_end_at && promotion_end_at < promotion_start_at)
      return { error: "프로모션 종료일이 시작일보다 빠를 수 없습니다." };
  }

  return {
    fields: {
      name,
      category,
      price_won,
      duration_min,
      description,
      is_active,
      display_order,
      photo_url,
      price_note,
      promotion_active,
      promotion_price_won,
      promotion_start_at: promotion_active ? promotion_start_at : null,
      promotion_end_at: promotion_active ? promotion_end_at : null,
    },
  };
}

export async function uploadServicePhoto(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const { shop } = await requireShop();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "파일이 없습니다." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext))
    return { error: "JPG, PNG, WebP 파일만 가능합니다." };
  if (file.size > 5 * 1024 * 1024)
    return { error: "파일 크기는 5MB 이하여야 합니다." };

  const admin = createAdminClient();
  // 버킷 없으면 생성 (이미 있으면 무시)
  await admin.storage
    .createBucket("service-photos", {
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 5242880,
    })
    .catch(() => {});

  const path = `${shop.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upError } = await admin.storage
    .from("service-photos")
    .upload(path, buf, { contentType: file.type || "image/jpeg", upsert: false });

  if (upError) return { error: upError.message };

  const { data: { publicUrl } } = admin.storage.from("service-photos").getPublicUrl(path);
  return { url: publicUrl };
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
    photo_url: parsed.photo_url,
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
      photo_url: parsed.photo_url,
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
