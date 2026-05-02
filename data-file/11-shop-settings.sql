-- ============================================================
-- 11. 매장 설정 확장 — 운영시간 + 알림톡
-- ============================================================

-- 운영시간 (JSONB)
-- 예: {"mon":{"open":"09:00","close":"19:00","closed":false}, ...}
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS business_hours JSONB,
  ADD COLUMN IF NOT EXISTS kakao_notify_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_phone TEXT;

COMMENT ON COLUMN shops.business_hours        IS '요일별 운영시간 JSONB {mon..sun: {open,close,closed}}';
COMMENT ON COLUMN shops.kakao_notify_enabled  IS '카카오 알림톡 발송 여부';
COMMENT ON COLUMN shops.notification_phone    IS '알림톡 발신번호 (Solapi 등록 번호)';
