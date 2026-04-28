-- ============================================================
-- 자주 구매 상품 view (tnt-mall 의 OrderItem 집계, 거래처별)
-- 실행 위치: Supabase SQL Editor (같은 인스턴스 — beautica/tnt-mall 공유)
--
-- beautica 가 사용:
--   SELECT * FROM shop_frequent_products
--   WHERE customer_company_id = $shop.customer_company_id
--   ORDER BY purchase_count DESC LIMIT 10
-- ============================================================

CREATE OR REPLACE VIEW shop_frequent_products AS
SELECT
  o."customerCompanyId"        AS customer_company_id,
  oi."productProdCd"            AS prod_cd,
  p."name"                      AS product_name,
  p."tier1",
  p."tier2",
  p."tier3",
  p."imageUrl"                  AS image_url,
  COUNT(*)::int                 AS purchase_count,
  SUM(oi.quantity)::int         AS total_quantity,
  MAX(o."createdAt")            AS last_purchased_at,
  MAX(oi."unitPrice")::int      AS last_unit_price
FROM "OrderItem" oi
JOIN "Order"   o ON o."id" = oi."orderId"
JOIN "Product" p ON p."prodCd" = oi."productProdCd"
WHERE o."customerCompanyId" IS NOT NULL
GROUP BY
  o."customerCompanyId",
  oi."productProdCd",
  p."name",
  p."tier1",
  p."tier2",
  p."tier3",
  p."imageUrl";

-- 권한 (Supabase REST API 에서 SELECT 가능하도록)
GRANT SELECT ON shop_frequent_products TO authenticated, service_role, anon;
-- (anon 도 GRANT 했지만 RLS 로 customer_company_id 검증 필요시 별도. 지금은 admin client 만 사용해서 우회.)
