import { requireShop } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFrequentProducts, fetchNewProducts, decidePrice } from "@/lib/tnt-mall";
import { NewOrderClient } from "./NewOrderClient";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ reorder?: string; add?: string }>;
}) {
  const { shop } = await requireShop();
  const sp = await searchParams;
  const admin = createAdminClient();

  if (!shop.customer_company_id) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">자재 주문</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          ⚠️ tnt-mall 거래처 매핑 (customer_company_id) 이 아직 안 되어 있어요. 먼저 onboarding 을 다시 진행해주세요.
        </div>
      </div>
    );
  }

  const [frequent, newProducts] = await Promise.all([
    fetchFrequentProducts(admin, shop.customer_company_id, 20),
    fetchNewProducts(admin, 30, 20),
  ]);

  // 카탈로그 — 자주 구매 + 신상품 (중복 제거)
  type CatalogItem = {
    prodCd: string;
    name: string;
    imageUrl: string | null;
    price: number | null;
    badge: "FREQUENT" | "NEW";
    hint: string;
  };

  const seen = new Set<string>();
  const catalog: CatalogItem[] = [];

  for (const p of frequent) {
    if (seen.has(p.prod_cd)) continue;
    seen.add(p.prod_cd);
    catalog.push({
      prodCd: p.prod_cd,
      name: p.product_name,
      imageUrl: p.image_url,
      price: decidePrice({
        tier1: p.tier1,
        tier2: p.tier2,
        tier3: p.tier3,
        shopTier: shop.tier,
        lastUnitPrice: p.last_unit_price,
      }),
      badge: "FREQUENT",
      hint: `${p.purchase_count}회 구매`,
    });
  }

  for (const p of newProducts) {
    if (seen.has(p.prodCd)) continue;
    seen.add(p.prodCd);
    catalog.push({
      prodCd: p.prodCd,
      name: p.name,
      imageUrl: p.imageUrl,
      price: decidePrice({
        tier1: p.tier1,
        tier2: p.tier2,
        tier3: p.tier3,
        shopTier: shop.tier,
      }),
      badge: "NEW",
      hint: "신상품",
    });
  }

  // 매장 주소를 배송 default 로
  const shopAddress = {
    recipient: shop.name,
    phone: shop.phone ?? "",
    zipcode: shop.postal_code ?? "",
    address1: shop.address ?? "",
    address2: shop.address_detail ?? "",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">자재 주문</h1>
        <p className="mt-1 text-sm text-gray-600">
          자주 구매 자재에서 빠르게 재주문하거나, 신상품을 장바구니에 추가하세요.
        </p>
      </div>

      <NewOrderClient
        shopSlug={shop.slug}
        shopTier={shop.tier}
        catalog={catalog}
        defaultShipping={shopAddress}
        initialAdd={sp.add ?? sp.reorder ?? null}
      />
    </div>
  );
}
