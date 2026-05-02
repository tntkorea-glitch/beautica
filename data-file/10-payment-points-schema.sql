-- ============================================================
-- 10. 예약금 + 포인트/로열티 시스템 스키마
-- 실행 위치: Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. shops: 예약금 설정 컬럼 추가
-- ─────────────────────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount   INTEGER NOT NULL DEFAULT 10000;

COMMENT ON COLUMN shops.deposit_required IS '예약금 필수 여부 (노쇼 방지)';
COMMENT ON COLUMN shops.deposit_amount   IS '예약금 금액 (원), 0 = 예약금 없음';

-- ─────────────────────────────────────────────────────
-- 2. bookings: 결제 정보 + 상태 확장
-- ─────────────────────────────────────────────────────

-- status CHECK 제약 교체 (PAYMENT_PENDING 추가)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('PAYMENT_PENDING','PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_paid       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount_won INTEGER,
  ADD COLUMN IF NOT EXISTS payment_key        TEXT,
  ADD COLUMN IF NOT EXISTS payment_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS payment_method     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_payment_order
  ON bookings(payment_order_id) WHERE payment_order_id IS NOT NULL;

COMMENT ON COLUMN bookings.deposit_paid       IS '예약금 결제 완료 여부';
COMMENT ON COLUMN bookings.deposit_amount_won IS '청구된 예약금 금액 (스냅샷)';
COMMENT ON COLUMN bookings.payment_key        IS '토스페이먼츠 paymentKey';
COMMENT ON COLUMN bookings.payment_order_id   IS '토스페이먼츠 orderId (UUID)';
COMMENT ON COLUMN bookings.payment_method     IS '결제 수단 (카드, 카카오페이 등)';

-- ─────────────────────────────────────────────────────
-- 3. customer_ledger — 전체 공용 포인트 원장 (전화번호 기반)
--    cross-shop 적립/사용 (beautica 전체 통합)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_ledger (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT    UNIQUE NOT NULL,
  name          TEXT,
  point_balance INTEGER NOT NULL DEFAULT 0 CHECK (point_balance >= 0),
  total_earned  INTEGER NOT NULL DEFAULT 0,
  total_spent   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_phone ON customer_ledger(phone);

CREATE TRIGGER customer_ledger_set_updated_at
  BEFORE UPDATE ON customer_ledger
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;

-- service role (admin client) 만 접근; 서버 액션이 admin client 로 처리
-- anon/authenticated 직접 접근 없음

-- ─────────────────────────────────────────────────────
-- 4. point_transactions — 포인트 이벤트 로그
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS point_transactions (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id     UUID    NOT NULL REFERENCES customer_ledger(id) ON DELETE CASCADE,
  phone         TEXT    NOT NULL,
  amount        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type          TEXT    NOT NULL CHECK (type IN (
                  'EARN_BOOKING',   -- 예약 완료 후 시술 금액 기준 적립
                  'EARN_DEPOSIT',   -- 예약금 결제 시 즉시 적립
                  'SPEND_TNTMALL',  -- tnt-mall 주문 차감
                  'SPEND_BEAUTICA', -- 미래 확장용
                  'EXPIRE',         -- 유효기간 만료 차감
                  'ADMIN_ADJUST'    -- 관리자 수동 조정
                )),
  shop_id       UUID    REFERENCES shops(id) ON DELETE SET NULL,
  booking_id    UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  description   TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ptx_ledger ON point_transactions(ledger_id);
CREATE INDEX IF NOT EXISTS idx_ptx_phone  ON point_transactions(phone);
CREATE INDEX IF NOT EXISTS idx_ptx_type   ON point_transactions(type, created_at);

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
