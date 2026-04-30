"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

type Result = { error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." } as const;
  if (!isAdminEmail(user.email)) return { error: "관리자 권한이 없습니다." } as const;
  return { user } as const;
}

export async function approveMatch(shopId: string, targetTier: 2 | 3): Promise<Result> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("beautica_approve_match", {
    p_shop_id: shopId,
    p_admin_id: guard.user.id,
    p_target_tier: targetTier,
  });

  if (error) {
    console.error("[admin/matches] approve_match RPC 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { error: "승인 처리 실패. 관리자 콘솔에서 RPC 로그 확인 필요." };
  }

  const result = data as { ok?: boolean; error?: string };
  if (result?.error) {
    if (result.error === "CONFLICT_OTHER_USER_MAPPED") {
      return { error: "이 거래처는 이미 다른 회원에 매핑되어 있습니다. 거절 처리하세요." };
    }
    return { error: `승인 실패: ${result.error}` };
  }

  return {};
}

export async function rejectMatch(shopId: string, reason: string): Promise<Result> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  if (!reason.trim()) return { error: "거절 사유를 입력해주세요." };

  const admin = createAdminClient();
  const { error } = await admin.rpc("beautica_reject_match", {
    p_shop_id: shopId,
    p_admin_id: guard.user.id,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error("[admin/matches] reject_match RPC 실패:", error);
    return { error: error.message };
  }

  return {};
}
