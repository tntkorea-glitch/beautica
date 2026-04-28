"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function respondConsultation(
  consultationId: string,
  response: string,
): Promise<Result> {
  const { shop } = await requireShop();
  if (!response.trim()) return { error: "답변 내용을 입력해주세요." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .update({
      shop_response: response.trim(),
      responded_at: new Date().toISOString(),
      status: "IN_PROGRESS",
    })
    .eq("id", consultationId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/consultations");
  revalidatePath(`/dashboard/consultations/${consultationId}`);
  return {};
}

export async function closeConsultation(consultationId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .update({ status: "CLOSED" })
    .eq("id", consultationId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/consultations");
  revalidatePath(`/dashboard/consultations/${consultationId}`);
  return {};
}

export async function reopenConsultation(consultationId: string): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  const { error } = await admin
    .from("consultations")
    .update({ status: "IN_PROGRESS" })
    .eq("id", consultationId)
    .eq("shop_id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/consultations");
  revalidatePath(`/dashboard/consultations/${consultationId}`);
  return {};
}
