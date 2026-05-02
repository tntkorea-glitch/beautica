-- ============================================================
-- 13. 예약금 상세 설정 + 시술 후 알림 설정
-- ============================================================

-- 예약금 설정 고도화
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS deposit_type          TEXT    NOT NULL DEFAULT 'FIXED',   -- FIXED | PERCENT
  ADD COLUMN IF NOT EXISTS deposit_percent       INTEGER NOT NULL DEFAULT 0,          -- % (1~100)
  ADD COLUMN IF NOT EXISTS deposit_wait_min      INTEGER NOT NULL DEFAULT 30,         -- 결제 대기 시간(분)
  ADD COLUMN IF NOT EXISTS deposit_cancel_min    INTEGER NOT NULL DEFAULT 1440,       -- 취소 확정 기준(분, default=24h)
  ADD COLUMN IF NOT EXISTS deposit_member_except BOOLEAN NOT NULL DEFAULT false;      -- 회원권 보유 고객 예약금 면제

-- 시술 후 알림 설정
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS post_notify_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_notify_delay_h   INTEGER NOT NULL DEFAULT 24;         -- 시술 완료 후 발송 시간(h)

COMMENT ON COLUMN shops.deposit_type          IS '예약금 유형: FIXED=정액, PERCENT=정률';
COMMENT ON COLUMN shops.deposit_percent       IS '정률 예약금 비율 (%)';
COMMENT ON COLUMN shops.deposit_wait_min      IS '예약금 결제 대기 시간 (분)';
COMMENT ON COLUMN shops.deposit_cancel_min    IS '예약금 취소 확정 기준 (분 이내 취소 시 자동 확정)';
COMMENT ON COLUMN shops.deposit_member_except IS '회원권 보유 고객 예약금 면제 여부';
COMMENT ON COLUMN shops.post_notify_enabled   IS '시술 후 자동 알림톡 발송 여부';
COMMENT ON COLUMN shops.post_notify_delay_h   IS '시술 완료 후 알림 발송까지 대기 시간 (시간)';
