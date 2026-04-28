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

export async function approveUpgrade(shopId: string): Promise<Result> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  const admin = createAdminClient();

  // shop + 운영자(owner) 조회 (RPC 호출에 supabase_user_id 필요)
  const [{ data: shop }, { data: ownerLink }] = await Promise.all([
    admin
      .from("shops")
      .select("id, name, business_number")
      .eq("id", shopId)
      .maybeSingle(),
    admin
      .from("shop_users")
      .select("user_id")
      .eq("shop_id", shopId)
      .eq("role", "OWNER")
      .maybeSingle(),
  ]);

  if (!shop) return { error: "매장을 찾을 수 없습니다." };
  if (!ownerLink?.user_id) return { error: "매장 운영자(OWNER)를 찾을 수 없습니다." };

  // 1) beautica shops 등업 처리
  const { error } = await admin
    .from("shops")
    .update({
      tier: 2,
      tier_upgrade_status: "APPROVED",
      tier_upgrade_reviewed_at: new Date().toISOString(),
      tier_upgrade_reviewed_by: guard.user.id,
      tier_upgrade_reject_reason: null,
    })
    .eq("id", shopId)
    .eq("tier_upgrade_status", "PENDING"); // race condition 방지

  if (error) return { error: error.message };

  // 2) tnt-mall CustomerCompany 동기화 (RPC, atomic)
  const { error: rpcError } = await admin.rpc("beautica_upgrade_customer", {
    p_supabase_user_id: ownerLink.user_id,
    p_business_number: shop.business_number,
    p_company_name: shop.name,
    p_target_tier: 2,
  });

  if (rpcError) {
    // 비차단: beautica 측은 이미 등업 처리됨. 동기화 실패는 로그.
    console.error("[admin/upgrades] tnt-mall 등업 동기화 실패:", rpcError);
  }

  return {};
}

export async function rejectUpgrade(
  shopId: string,
  reason: string,
): Promise<Result> {
  const guard = await requireAdmin();
  if ("error" in guard) return guard;

  if (!reason.trim()) return { error: "거절 사유를 입력해주세요." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("shops")
    .update({
      tier_upgrade_status: "REJECTED",
      tier_upgrade_reviewed_at: new Date().toISOString(),
      tier_upgrade_reviewed_by: guard.user.id,
      tier_upgrade_reject_reason: reason.trim(),
    })
    .eq("id", shopId)
    .eq("tier_upgrade_status", "PENDING");

  if (error) return { error: error.message };
  return {};
}
