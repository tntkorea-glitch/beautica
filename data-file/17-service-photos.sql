-- ============================================================
-- 17. 시술 메뉴 사진
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN services.photo_url IS 'Supabase Storage service-photos 버킷 public URL';

-- [필수] Supabase 대시보드 → Storage → New Bucket
--   이름: service-photos
--   Public bucket: ON (공개 예약 페이지에서 인증 없이 노출)
