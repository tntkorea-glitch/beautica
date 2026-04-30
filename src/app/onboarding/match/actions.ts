"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

async function getOwnedShop(shopId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." } as const;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("shop_users")
    .select("shops!inner(id, name, owner_name, phone, business_number, business_license_url)")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .eq("role", "OWNER")
    .maybeSingle();

  const shop = link?.shops as unknown as
    | {
        id: string;
        name: string;
        owner_name: string;
        phone: string | null;
        business_number: string | null;
        business_license_url: string | null;
      }
    | null
    | undefined;

  if (!shop) return { error: "매장을 찾을 수 없습니다." } as const;
  return { user, shop, admin } as const;
}

export async function confirmMatch(input: {
  shopId: string;
  partnerId: string;
  score: number;
  signals: string[];
}): Promise<Result> {
  const ctx = await getOwnedShop(input.shopId);
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.admin.rpc("beautica_request_match", {
    p_shop_id: input.shopId,
    p_user_id: ctx.user.id,
    p_partner_id: input.partnerId,
    p_score: input.score,
    p_signals: input.signals,
  });

  if (error) {
    console.error("[onboarding/match] request_match RPC 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return { error: "매칭 신청 처리 실패. 관리자에게 문의해주세요." };
  }

  const result = data as { ok?: boolean; error?: string };
  if (result?.error === "CONFLICT_OTHER_USER_MAPPED") {
    return {
      error:
        "이 거래처는 이미 다른 회원에 연결되어 있습니다. 본인 거래처가 맞다면 관리자에게 문의해주세요.",
    };
  }
  if (result?.error) {
    return { error: `매칭 신청 실패: ${result.error}` };
  }

  return {};
}

export async function registerNew(input: { shopId: string }): Promise<Result> {
  const ctx = await getOwnedShop(input.shopId);
  if ("error" in ctx) return { error: ctx.error };

  const { user, shop, admin } = ctx;

  const { data: rpcData, error: rpcError } = await admin.rpc(
    "beautica_create_customer",
    {
      p_supabase_user_id: user.id,
      p_email: user.email,
      p_name: shop.name,
      p_company_name: shop.name,
      p_business_number: shop.business_number,
      p_initial_tier: 1,
      p_customer_type: "INDIVIDUAL",
    },
  );

  if (rpcError) {
    console.error("[onboarding/match] create_customer 실패:", {
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
    });
    return { error: "신규 거래처 등록 실패. 관리자에게 문의해주세요." };
  }

  const ccId = (rpcData as { customerCompanyId?: string } | null)?.customerCompanyId;
  if (ccId) {
    await admin
      .from("shops")
      .update({ customer_company_id: ccId })
      .eq("id", shop.id);
  }

  return {};
}
