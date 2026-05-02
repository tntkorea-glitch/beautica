"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." } as const;
  if (!isAdminEmail(user.email)) return { error: "관리자 권한이 없습니다." } as const;
  return { user } as const;
}

export type PartnerSearchResult = {
  partnerId: string;
  customerCompanyId: string | null;
  partnerName: string;
  representative: string | null;
  businessNo: string | null;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  ccTier: number | null;
  alreadyMappedToOther: boolean;
};

type PartnerRow = {
  id: string;
  name: string;
  representative: string | null;
  businessNo: string | null;
  mobile: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
};

type CcRow = {
  id: string;
  partnerId: string | null;
  tier: number;
  supabaseUserId: string | null;
};

export async function searchPartners(
  query: string,
  ownerUserId: string | null,
): Promise<{ error?: string; results: PartnerSearchResult[] }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error, results: [] };

  const safe = query.replace(/[,()*]/g, " ").trim();
  if (!safe) return { results: [] };

  const admin = createAdminClient();
  const escaped = safe.replace(/%/g, "");
  // 사업자번호/휴대폰은 DB 에 정규화(숫자만)된 형태로 저장된 경우가 많음 — 숫자만 추출한 변형도 같이 검색
  const digits = escaped.replace(/\D/g, "");

  const filters = [
    `name.ilike.%${escaped}%`,
    `representative.ilike.%${escaped}%`,
    `businessNo.ilike.%${escaped}%`,
    `mobile.ilike.%${escaped}%`,
    `phone.ilike.%${escaped}%`,
  ];
  if (digits && digits !== escaped) {
    filters.push(
      `businessNo.ilike.%${digits}%`,
      `mobile.ilike.%${digits}%`,
      `phone.ilike.%${digits}%`,
    );
  }

  const { data: partners, error } = await admin
    .from("Partner")
    .select("id, name, representative, businessNo, mobile, phone, address1, address2")
    .or(filters.join(","))
    .in("type", ["CUSTOMER", "BOTH"])
    .limit(20);

  if (error) {
    console.error("[admin/shops] searchPartners 실패:", error);
    return { error: error.message, results: [] };
  }

  const list = (partners ?? []) as PartnerRow[];
  if (list.length === 0) return { results: [] };

  const partnerIds = list.map((p) => p.id);
  const { data: ccs } = await admin
    .from("CustomerCompany")
    .select("id, partnerId, tier, supabaseUserId")
    .in("partnerId", partnerIds);

  const ccByPartner = new Map<string, CcRow>(
    ((ccs as CcRow[] | null) ?? []).map((cc) => [cc.partnerId as string, cc]),
  );

  const results: PartnerSearchResult[] = list.map((p) => {
    const cc = ccByPartner.get(p.id);
    return {
      partnerId: p.id,
      customerCompanyId: cc?.id ?? null,
      partnerName: p.name,
      representative: p.representative ?? null,
      businessNo: p.businessNo ?? null,
      mobile: p.mobile ?? null,
      phone: p.phone ?? null,
      address: [p.address1, p.address2].filter(Boolean).join(" ") || null,
      ccTier: cc?.tier ?? null,
      alreadyMappedToOther: !!cc?.supabaseUserId && cc.supabaseUserId !== ownerUserId,
    };
  });

  return { results };
}

export async function manualMatch(input: {
  shopId: string;
  partnerId: string;
  targetTier: 1 | 2 | 3;
}): Promise<{ error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("beautica_admin_manual_match", {
    p_shop_id: input.shopId,
    p_admin_id: guard.user.id,
    p_target_partner_id: input.partnerId,
    p_target_tier: input.targetTier,
  });

  if (error) {
    console.error("[admin/shops] manual_match RPC 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      error:
        error.message?.includes("function") && error.message?.includes("does not exist")
          ? "RPC 미배포: data-file/08-admin-manual-match.sql 을 Supabase SQL Editor 에서 실행하세요."
          : `매칭 실패: ${error.message}`,
    };
  }

  const result = data as { ok?: boolean; error?: string };
  if (result?.error === "CONFLICT_OTHER_USER_MAPPED") {
    return { error: "이 거래처는 이미 다른 회원에 연결되어 있습니다." };
  }
  if (result?.error) {
    return { error: `매칭 실패: ${result.error}` };
  }

  revalidatePath(`/admin/shops/${input.shopId}`);
  revalidatePath("/admin/shops");
  return {};
}
