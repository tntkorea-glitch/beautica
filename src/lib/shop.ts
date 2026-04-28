import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Shop = {
  id: string;
  slug: string;
  name: string;
  tier: number;
  business_number: string | null;
  business_license_url: string | null;
  customer_company_id: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  description: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  tier_upgrade_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  tier_upgrade_reject_reason: string | null;
  naver_booking_enabled: boolean;
  naver_booking_business_id: string | null;
  naver_place_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 현재 인증된 사용자 + 소속 샵을 반환.
 * 비인증 → /login, 샵 없음 → /onboarding 으로 redirect.
 *
 * server.ts client 의 PostgREST 인증 토큰 전달이 일부 환경에서 작동하지 않아
 * 데이터 조회는 admin client 로 (RLS 우회). 격리는 user_id 검증으로 보장.
 */
export async function requireShop() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: shopUser } = await admin
    .from("shop_users")
    .select("role, shops!inner(*)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!shopUser) redirect("/onboarding");
  const shop = shopUser.shops as unknown as Shop;
  if (!shop.onboarding_completed) redirect("/onboarding");

  return { user, shop, role: shopUser.role as "OWNER" | "STAFF" };
}
