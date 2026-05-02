-- ============================================================
-- 16. Solapi 알림톡 API 연동 (샵별 자체 키)
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS solapi_api_key          TEXT,
  ADD COLUMN IF NOT EXISTS solapi_api_secret        TEXT,
  ADD COLUMN IF NOT EXISTS solapi_pfid              TEXT,
  ADD COLUMN IF NOT EXISTS solapi_template_confirmed TEXT,
  ADD COLUMN IF NOT EXISTS solapi_template_cancelled TEXT;

COMMENT ON COLUMN shops.solapi_api_key           IS 'Solapi API Key (각 샵 자체 발급)';
COMMENT ON COLUMN shops.solapi_api_secret        IS 'Solapi API Secret (각 샵 자체 발급)';
COMMENT ON COLUMN shops.solapi_pfid              IS '카카오 채널 프로필 ID (Solapi 채널 연결)';
COMMENT ON COLUMN shops.solapi_template_confirmed IS '예약 확정 알림톡 템플릿 코드';
COMMENT ON COLUMN shops.solapi_template_cancelled IS '예약 취소 알림톡 템플릿 코드';
