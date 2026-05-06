"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireShop } from "@/lib/shop";

type Result = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." } as const;
  return { user } as const;
}

export async function upsertProfile(input: {
  displayName: string;
  personalPhone: string;
  profileImagePath: string | null;
  notificationChannels: { email: boolean; kakao: boolean; push: boolean };
  notificationTypes: { booking: boolean; consultation: boolean; upgrade: boolean; order: boolean };
}): Promise<Result> {
  const guard = await requireUser();
  if ("error" in guard) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: guard.user.id,
      display_name: input.displayName.trim() || null,
      personal_phone: input.personalPhone.trim() || null,
      profile_image_path: input.profileImagePath,
      notification_channels: input.notificationChannels,
      notification_types: input.notificationTypes,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[dashboard/profile] upsert 실패:", error);
    return {
      error:
        error.message?.includes("relation") && error.message?.includes("does not exist")
          ? "테이블 미배포: data-file/09-user-profile.sql 을 Supabase SQL Editor 에서 실행하세요."
          : `저장 실패: ${error.message}`,
    };
  }

  revalidatePath("/dashboard/profile");
  return {};
}

export async function requestAccountDeletion(reason: string): Promise<Result> {
  const guard = await requireUser();
  if ("error" in guard) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: guard.user.id,
      deletion_requested_at: new Date().toISOString(),
      deletion_reason: reason.trim() || null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[dashboard/profile] deletion request 실패:", error);
    return { error: `요청 실패: ${error.message}` };
  }

  revalidatePath("/dashboard/profile");
  return {};
}

export async function cancelAccountDeletion(): Promise<Result> {
  const guard = await requireUser();
  if ("error" in guard) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({ deletion_requested_at: null, deletion_reason: null })
    .eq("user_id", guard.user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/profile");
  return {};
}

/** 샵에서 사용할 시술 카테고리 목록 저장 */
export async function updateShopCategories(categories: string[]): Promise<Result> {
  const { shop } = await requireShop();
  const admin = createAdminClient();
  // 빈 배열도 명시적 비활성으로 허용
  const cleaned = Array.from(
    new Set(categories.map((c) => c.trim()).filter(Boolean)),
  );
  const { error } = await admin
    .from("shops")
    .update({ enabled_categories: cleaned })
    .eq("id", shop.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/services/new");
  return {};
}
