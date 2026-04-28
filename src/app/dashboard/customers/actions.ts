"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

function parseFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const birthday = String(formData.get("birthday") ?? "").trim() || null;
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const gender = genderRaw && ["MALE", "FEMALE", "OTHER"].includes(genderRaw)
    ? genderRaw
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
    : [];

  if (!name) return { error: "이름을 입력해주세요." } as const;
  return { name, phone, email, birthday, gender, notes, tags } as const;
}

export async function createCustomer(formData: FormData): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const { error } = await admin.from("customers").insert({
    shop_id: shop.id,
    ...parsed,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export async function updateCustomer(
  customerId: string,
  formData: FormData,
): Promise<Result> {
  const { shop } = await requireShop();
  const parsed = parseFields(formData);
  if ("error" in parsed) return parsed;

  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update(parsed)
    .eq("id", customerId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}`);
  redirect(`/dashboard/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}
