-- ============================================================
-- 19. 예약 고객 포인트 로열티 시스템 — 샵별 독립 적립/사용
-- 실행 위치: Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. customer_ledger: cross-shop → per-shop 전환
--    phone 단독 UNIQUE → (phone, shop_id) 복합 UNIQUE
-- ─────────────────────────────────────────────────────
ALTER TABLE customer_ledger
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES shops(id) ON DELETE CASCADE;

-- 기존 phone 단독 UNIQUE 제약 제거
ALTER TABLE customer_ledger DROP CONSTRAINT IF EXISTS customer_ledger_phone_key;

-- 기존 phone 단독 인덱스 제거 (있는 경우)
DROP INDEX IF EXISTS idx_ledger_phone;

-- 새 복합 유니크 인덱스 (phone + shop_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_phone_shop
  ON customer_ledger(phone, shop_id);

-- ─────────────────────────────────────────────────────
-- 2. shops: 포인트 설정 컬럼 추가
-- ─────────────────────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS points_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_min_use INTEGER NOT NULL DEFAULT 1000;

COMMENT ON COLUMN shops.points_enabled IS '예약 고객 포인트 적립/사용 활성화';
COMMENT ON COLUMN shops.points_min_use IS '1회 예약 시 최소 포인트 사용 금액 (원), 0 사용은 항상 허용';

-- ─────────────────────────────────────────────────────
-- 3. bookings: 포인트 사용 기록 컬럼 추가
-- ─────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS points_used INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN bookings.points_used IS '이 예약에서 사용한 포인트 (원), 0 = 미사용';
