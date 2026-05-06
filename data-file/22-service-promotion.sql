-- ============================================================
-- 22. 시술 메뉴 프로모션 + 가격 부가설명
--   - 정가(price_won) 위에 프로모션가(promotion_price_won) 추가
--   - 운영자 토글로 프로모션 활성화/비활성화
--   - 적용 기간 안에 있을 때만 공개 페이지에 강조 노출
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS price_note            TEXT,
  ADD COLUMN IF NOT EXISTS promotion_active      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promotion_price_won   INT,
  ADD COLUMN IF NOT EXISTS promotion_start_at    DATE,
  ADD COLUMN IF NOT EXISTS promotion_end_at      DATE;

COMMENT ON COLUMN services.price_note          IS '가격 부가설명 (예: "1인 기준", "+추가비")';
COMMENT ON COLUMN services.promotion_active    IS '프로모션 ON/OFF — true 일 때만 promotion_price_won 적용';
COMMENT ON COLUMN services.promotion_price_won IS '프로모션 적용 가격 (원)';
COMMENT ON COLUMN services.promotion_start_at  IS '프로모션 시작일 (포함). NULL 이면 즉시.';
COMMENT ON COLUMN services.promotion_end_at    IS '프로모션 종료일 (포함). NULL 이면 무기한.';
