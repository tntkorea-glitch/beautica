"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { error?: string };

export async function completeOnboarding(formData: FormData): Promise<Result> {
  // 사용자 인증 확인 (사용자 세션 client)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const businessNumber = String(formData.get("business_number") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const postalCode = String(formData.get("postal_code") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const addressDetail = String(formData.get("address_detail") ?? "").trim() || null;
  const businessLicenseUrl =
    String(formData.get("business_license_url") ?? "").trim() || null;

  if (!name) return { error: "매장명을 입력해주세요." };
  if (!ownerName) return { error: "대표자명을 입력해주세요." };
  if (!phone) return { error: "대표 연락처를 입력해주세요." };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "매장 ID 는 영문 소문자/숫자/하이픈만 사용할 수 있습니다." };
  }

  if (businessLicenseUrl && !businessLicenseUrl.startsWith(`${user.id}/`)) {
    return { error: "잘못된 첨부 파일 경로입니다." };
  }

  const isUpgradeRequest = !!businessNumber && !!businessLicenseUrl;

  // INSERT 는 admin client 로 (RLS 우회, user.id 코드에서 명시)
  const admin = createAdminClient();

  const { data: shop, error: shopError } = await admin
    .from("shops")
    .insert({
      name,
      owner_name: ownerName,
      slug,
      tier: 1,
      business_number: businessNumber,
      business_license_url: businessLicenseUrl,
      tier_upgrade_status: isUpgradeRequest ? "PENDING" : null,
      tier_upgrade_requested_at: isUpgradeRequest ? new Date().toISOString() : null,
      phone,
      postal_code: postalCode,
      address,
      address_detail: addressDetail,
      onboarding_completed: true,
    })
    .select("id")
    .single();

  if (shopError || !shop) {
    if (shopError?.code === "23505") {
      return { error: "이미 사용 중인 매장 ID 입니다. 다른 값으로 시도해주세요." };
    }
    return { error: shopError?.message ?? "매장 등록에 실패했습니다." };
  }

  const { error: linkError } = await admin.from("shop_users").insert({
    shop_id: shop.id,
    user_id: user.id,
    role: "OWNER",
  });

  if (linkError) {
    return { error: `매장-운영자 연결 실패: ${linkError.message}` };
  }

  // ─────────────────────────────────────────────────────
  // tnt-mall 거래처 매칭 시도 (점수화 + 후보 노출)
  //   후보 ≥ 1 → /onboarding/match 로 redirect (회원 선택 단계)
  //   후보 0    → 신규 거래처 자동 등록 (기존 흐름)
  // ─────────────────────────────────────────────────────
  const { data: candidates, error: matchError } = await admin.rpc(
    "beautica_match_candidates",
    {
      p_business_number: businessNumber,
      p_company_name: name,
      p_owner_name: ownerName,
      p_mobile: phone,
      p_user_id: user.id,
      p_limit: 5,
    },
  );

  if (matchError) {
    console.error("[onboarding] match RPC 실패:", {
      message: matchError.message,
      code: matchError.code,
      details: matchError.details,
      hint: matchError.hint,
    });
    // 비차단: 매칭 실패해도 신규 거래처 흐름으로 진행
  }

  const candidateList = (candidates ?? []) as Array<{
    partner_id: string;
    customer_company_id: string | null;
    already_mapped_to_other: boolean;
  }>;
  const usableCandidates = candidateList.filter((c) => !c.already_mapped_to_other);

  if (usableCandidates.length > 0) {
    // 후보 있음 → 매칭 선택 페이지
    redirect(`/onboarding/match?shop=${shop.id}`);
  }

  // 후보 0 → 신규 거래처 자동 등록 (idempotent RPC)
  const { data: rpcData, error: rpcError } = await admin.rpc(
    "beautica_create_customer",
    {
      p_supabase_user_id: user.id,
      p_email: user.email,
      p_name: name,
      p_company_name: name,
      p_business_number: businessNumber,
      p_initial_tier: 1,
      p_customer_type: "INDIVIDUAL",
    },
  );

  if (rpcError) {
    console.error("[onboarding] tnt-mall 거래처 생성 실패:", {
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
    });
    // 비차단: shops 는 이미 만들어졌으니 진행
  } else {
    const ccId = (rpcData as { customerCompanyId?: string } | null)?.customerCompanyId;
    if (ccId) {
      await admin
        .from("shops")
        .update({ customer_company_id: ccId })
        .eq("id", shop.id);
    }
  }

  redirect("/dashboard");
}
