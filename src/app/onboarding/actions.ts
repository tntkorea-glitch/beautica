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
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const businessNumber = String(formData.get("business_number") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const postalCode = String(formData.get("postal_code") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const addressDetail = String(formData.get("address_detail") ?? "").trim() || null;
  const businessLicenseUrl =
    String(formData.get("business_license_url") ?? "").trim() || null;

  if (!name) return { error: "매장명을 입력해주세요." };
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

  // tnt-mall 거래처 4계층 자동 등록 (RPC: atomic + idempotent)
  // 정책: 가입 시 무조건 tier=1 (B2C/INDIVIDUAL). 등업은 admin 승인 후 별도 RPC.
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
    // 비차단: beautica shops 는 이미 만들어졌으니 진행. 거래처 동기화 실패는 로그만.
    console.error("[onboarding] tnt-mall 거래처 생성 실패:", rpcError);
  } else {
    const ccId = (rpcData as { customerCompanyId?: string } | null)?.customerCompanyId;
    if (ccId) {
      await admin
        .from("shops")
        .update({ customer_company_id: ccId })
        .eq("id", shop.id);
    }
  }

  // 성공 → server-side redirect (NEXT_REDIRECT throw, 클라이언트 자동 navigate)
  redirect("/dashboard");
}
