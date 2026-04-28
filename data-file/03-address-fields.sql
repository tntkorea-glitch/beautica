-- ============================================================
-- shops 주소 컬럼 분리 (우편번호/도로명/상세)
-- 실행 위치: Supabase SQL Editor
--   https://supabase.com/dashboard/project/iuffpkiwarkdmddwgdwt/sql/new
--
-- 변경: 단일 address (도로명+상세 합쳐 저장) → 3개 컬럼으로 분리
--   - postal_code (우편번호 5자리)
--   - address      (도로명 주소, 기존 컬럼 의미 유지)
--   - address_detail (상세주소)
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS postal_code    TEXT,
  ADD COLUMN IF NOT EXISTS address_detail TEXT;
