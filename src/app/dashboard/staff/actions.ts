"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

function parseFields(formData: FormData): Result & {
  name?: string;
  display_color?: string;
  position?: string | null;
  commission_rate?: number | null;
  is_active?: boolean;
  display_order?: number;
} {
  const name = String(formData.get("name") ?? "").trim();
  const display_color = String(formData.get("display_color") ?? "#84a59d").trim() || "#84a59d";
  const position = String(formData.get("position") ?? "").trim() || null;
  const commissionStr = String(formData.get("commission_rate") ?? "").trim();
  const commission_rate = commissionStr ? Number(commissionStr) : null;
  const is_active = formData.get("is_active") === "on";
  const orderStr = String(formData.get("display_order") ?? "0").replace(/\D/g, "");

  if (!name) return { error: "이름을 입력해주세요." };
  if (commission_rate != null && (Number.isNaN(commission_rate) || commission_rate < 0 || commission_rate > 100)) {
    return { error: "커미션율은 0~100 사이 숫자로 입력해주세요." };
  }

  return {
    name,
    display_color,
    position,
    commission_rate,
    is_active,
    display_order: Number(orderStr) || 0,
  };
}

export async function createStaff(formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if (parsed.error) return parsed;

  const admin = createAdminClient();
  const { error } = await admin.from("staff").insert({
    shop_id: shop.id,
    name: parsed.name,
    display_color: parsed.display_color,
    position: parsed.position,
    commission_rate: parsed.commission_rate,
    is_active: parsed.is_active,
    display_order: parsed.display_order,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}

export async function updateStaff(staffId: string, formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if (parsed.error) return parsed;

  const admin = createAdminClient();
  const { error } = await admin
    .from("staff")
    .update({
      name: parsed.name,
      display_color: parsed.display_color,
      position: parsed.position,
      commission_rate: parsed.commission_rate,
      is_active: parsed.is_active,
      display_order: parsed.display_order,
    })
    .eq("id", staffId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}

export async function deleteStaff(staffId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff")
    .delete()
    .eq("id", staffId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff");
}

export async function toggleStaffActive(staffId: string, nextActive: boolean) {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  await admin
    .from("staff")
    .update({ is_active: nextActive })
    .eq("id", staffId)
    .eq("shop_id", shop.id);
  revalidatePath("/dashboard/staff");
}
