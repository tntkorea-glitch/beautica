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
    console.error("[tnt-mall] fetchFrequentProducts:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  const products = (data ?? []) as FrequentProduct[];
  if (products.length === 0) return [];

  // Product.imageUrl 이 비어있는 경우 SiteProduct 이미지로 보완
  const prodCds = products.map((p) => p.prod_cd);
  const { data: skus } = await admin
    .from("SiteProductSKU")
    .select("siteProductId, prodCd, isPrimary")
    .in("prodCd", prodCds);
  const skuList = (skus ?? []) as Array<{ siteProductId: string; prodCd: string | null; isPrimary: boolean }>;

  const siteIdByProdCd = new Map<string, string>();
  for (const sku of skuList) {
    if (!sku.prodCd) continue;
    const existing = siteIdByProdCd.get(sku.prodCd);
    if (!existing || sku.isPrimary) siteIdByProdCd.set(sku.prodCd, sku.siteProductId);
  }

  const siteIds = Array.from(new Set([...siteIdByProdCd.values()]));
  let imageUrlBySiteId = new Map<string, string | null>();
  if (siteIds.length > 0) {
    const { data: sites } = await admin
      .from("SiteProduct")
      .select("id, imageUrl")
      .in("id", siteIds);
    imageUrlBySiteId = new Map(
      ((sites ?? []) as Array<{ id: string; imageUrl: string | null }>).map((s) => [s.id, s.imageUrl]),
    );
  }

  return products.map((p) => {
    if (p.image_url) return p;
    const siteId = siteIdByProdCd.get(p.prod_cd);
    const siteImage = siteId ? imageUrlBySiteId.get(siteId) ?? null : null;
    return { ...p, image_url: siteImage };
  });
}

/**
 * 신상품 (tnt-mall SiteProduct — publishedAt 최근 N일)
 * 도매 회원도 보이도록 visibility = PUBLIC 또는 WHOLESALE.
 *
 * 데이터 모델:
 *   SiteProduct (사이트 노출 단위) → SiteProductSKU (옵션별) → Product (실제 prodCd + tier 가격)
 *   tier 가격은 primary SKU 기준의 Product 에서 가져옴.
 */
export async function fetchNewProducts(
  admin: SupabaseClient,
  daysWindow = 30,
  limit = 10,
): Promise<NewProduct[]> {
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000).toISOString();

  // 1) SiteProduct
  const { data: sites, error: siteError } = await admin
    .from("SiteProduct")
    .select("id, name, imageUrl, publishedAt, visibility")
    .gt("publishedAt", since)
    .in("visibility", ["PUBLIC", "WHOLESALE"])
    .order("publishedAt", { ascending: false })
    .limit(limit);
  if (siteError) {
    console.error("[tnt-mall] fetchNewProducts SiteProduct:", {
      message: siteError.message,
      code: siteError.code,
      details: siteError.details,
      hint: siteError.hint,
    });
    return [];
  }
  const siteList = (sites ?? []) as Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    publishedAt: string;
  }>;
  if (siteList.length === 0) return [];

  // 2) primary SKU (없으면 첫 SKU) 의 prodCd 매핑
  const siteIds = siteList.map((s) => s.id);
  const { data: skus, error: skuError } = await admin
    .from("SiteProductSKU")
    .select("siteProductId, prodCd, isPrimary")
    .in("siteProductId", siteIds);
  if (skuError) {
    console.error("[tnt-mall] fetchNewProducts SiteProductSKU:", skuError);
  }
  const skuList = (skus ?? []) as Array<{
    siteProductId: string;
    prodCd: string | null;
    isPrimary: boolean;
  }>;
  const prodCdBySite = new Map<string, string>();
  for (const sku of skuList) {
    if (!sku.prodCd) continue;
    const existing = prodCdBySite.get(sku.siteProductId);
    if (!existing || sku.isPrimary) prodCdBySite.set(sku.siteProductId, sku.prodCd);
  }

  // 3) Product 에서 tier 가격
  const prodCds = Array.from(new Set([...prodCdBySite.values()]));
  let priceByProdCd = new Map<string, { tier1: number | null; tier2: number | null; tier3: number | null }>();
  if (prodCds.length > 0) {
    const { data: products, error: prodError } = await admin
      .from("Product")
      .select("prodCd, tier1, tier2, tier3")
      .in("prodCd", prodCds);
    if (prodError) {
      console.error("[tnt-mall] fetchNewProducts Product:", prodError);
    }
    priceByProdCd = new Map(
      ((products ?? []) as Array<{
        prodCd: string;
        tier1: number | null;
        tier2: number | null;
        tier3: number | null;
      }>).map((p) => [p.prodCd, { tier1: p.tier1, tier2: p.tier2, tier3: p.tier3 }]),
    );
  }

  return siteList.map((s) => {
    const prodCd = prodCdBySite.get(s.id) ?? s.id;
    const price = priceByProdCd.get(prodCd) ?? { tier1: null, tier2: null, tier3: null };
    return {
      prodCd,
      name: s.name,
      tier1: price.tier1,
      tier2: price.tier2,
      tier3: price.tier3,
      imageUrl: s.imageUrl,
      publishedAt: s.publishedAt,
    };
  });
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
