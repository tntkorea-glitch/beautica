import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * tnt-mall 의 공유 Supabase 테이블/뷰 헬퍼.
 * 모두 admin client 로 호출 (RLS 우회 — 다른 매장 데이터에 접근 안 하도록 코드에서 customer_company_id/shop tier 검증).
 */

export type FrequentProduct = {
  prod_cd: string;
  product_name: string;
  tier1: number | null;
  tier2: number | null;
  tier3: number | null;
  image_url: string | null;
  purchase_count: number;
  total_quantity: number;
  last_purchased_at: string;
  last_unit_price: number | null;
};

export type NewProduct = {
  prodCd: string;
  name: string;
  tier1: number | null;
  tier2: number | null;
  tier3: number | null;
  imageUrl: string | null;
  publishedAt: string;
};

/**
 * 자주 구매 상품 (tnt-mall view: shop_frequent_products)
 * customer_company_id 가 null 이면 빈 배열.
 */
export async function fetchFrequentProducts(
  admin: SupabaseClient,
  customerCompanyId: string | null,
  limit = 10,
): Promise<FrequentProduct[]> {
  if (!customerCompanyId) return [];
  const { data, error } = await admin
    .from("shop_frequent_products")
    .select("*")
    .eq("customer_company_id", customerCompanyId)
    .order("purchase_count", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tnt-mall] fetchFrequentProducts:", error);
    return [];
  }
  return (data ?? []) as FrequentProduct[];
}

/**
 * 신상품 (tnt-mall SiteProduct 테이블 — publishedAt 최근 N일)
 * 도매 회원도 보이도록 visibility = PUBLIC 또는 WHOLESALE.
 */
export async function fetchNewProducts(
  admin: SupabaseClient,
  daysWindow = 30,
  limit = 10,
): Promise<NewProduct[]> {
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("SiteProduct")
    .select("prodCd, name, tier1, tier2, tier3, imageUrl, publishedAt, visibility")
    .gt("publishedAt", since)
    .in("visibility", ["PUBLIC", "WHOLESALE"])
    .order("publishedAt", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[tnt-mall] fetchNewProducts:", error);
    return [];
  }
  return (data ?? []) as NewProduct[];
}

/**
 * 등급별 단가 결정 — pricing_policy.md 의 MAX 로직.
 * 가격 = MAX(현재 등급 단가, 최근 구매단가)
 *   - 둘 다 있으면 MAX
 *   - 하나만 있으면 그것
 *   - 둘 다 null 이면 null
 */
export function decidePrice(opts: {
  tier1: number | null;
  tier2: number | null;
  tier3: number | null;
  shopTier: number;
  lastUnitPrice?: number | null;
}): number | null {
  const tierKey = `tier${opts.shopTier}` as "tier1" | "tier2" | "tier3";
  const tierPrice = opts[tierKey];
  const last = opts.lastUnitPrice ?? null;
  if (tierPrice != null && last != null) return Math.max(tierPrice, last);
  if (last != null) return last;
  if (tierPrice != null) return tierPrice;
  return null;
}
