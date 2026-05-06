-- ============================================================
-- 23. 샵별 사용할 시술 카테고리 선택
--   - shops.enabled_categories: NULL = 전체 표시, [] = 비활성, 배열 = 선택된 카테고리만 ServiceForm 칩으로 노출
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS enabled_categories TEXT[];

COMMENT ON COLUMN shops.enabled_categories IS
  '시술 메뉴 등록 시 사용자에게 노출할 카테고리. NULL=전체 프리셋 표시, []=비활성, 배열=해당 카테고리만 노출.';
