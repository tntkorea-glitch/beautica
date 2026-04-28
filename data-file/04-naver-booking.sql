-- ============================================================
-- 네이버 예약 연동 (on/off) + 예약 출처 표시
-- 실행 위치: Supabase SQL Editor
--   https://supabase.com/dashboard/project/iuffpkiwarkdmddwgdwt/sql/new
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. shops: 네이버 예약 연동 설정
-- ─────────────────────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS naver_booking_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS naver_booking_business_id TEXT,
  ADD COLUMN IF NOT EXISTS naver_place_url           TEXT;
  -- 실제 API 연동 시점에 access_token / refresh_token / sync_state 등 추가 예정.

-- ─────────────────────────────────────────────────────
-- 2. bookings: 예약 출처 표시
-- ─────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'BEAUTICA'
    CHECK (source IN ('BEAUTICA', 'NAVER', 'WALK_IN', 'PHONE')),
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- 같은 외부 ID 중복 방지 + 네이버 sync 시 빠른 lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_external_unique
  ON bookings(source, external_id)
  WHERE external_id IS NOT NULL;
