-- ============================================================
-- Tier 등업 신청 (수동 승인) + 사업자등록증/명함 파일 첨부
-- 실행 위치: Supabase SQL Editor
--   https://supabase.com/dashboard/project/iuffpkiwarkdmddwgdwt/sql/new
--
-- 변경 사항:
--   - 회원가입 시 무조건 tier=1 (B2C). 등업은 관리자 수동 승인 흐름.
--   - shops 테이블에 등업 신청 메타 컬럼 추가
--   - 사업자등록증/명함 파일 저장용 Storage bucket 'business-licenses' 생성
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. shops 컬럼 추가 (등업 신청 메타)
-- ─────────────────────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS business_license_url       TEXT,
  ADD COLUMN IF NOT EXISTS tier_upgrade_status        TEXT
    CHECK (tier_upgrade_status IS NULL OR tier_upgrade_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS tier_upgrade_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_upgrade_reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier_upgrade_reviewed_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS tier_upgrade_reject_reason TEXT;

-- 등업 신청 대기열 인덱스 (관리자 화면용)
CREATE INDEX IF NOT EXISTS idx_shops_tier_upgrade_pending
  ON shops(tier_upgrade_requested_at)
  WHERE tier_upgrade_status = 'PENDING';

-- ─────────────────────────────────────────────────────
-- 2. Storage bucket 생성 (사업자등록증/명함)
-- ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-licenses',
  'business-licenses',
  FALSE,                                    -- private (인증/RLS 통한 접근만)
  10 * 1024 * 1024,                         -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- 3. Storage RLS 정책
--   파일 경로 컨벤션: {user_id}/{filename}
--   본인은 본인 폴더만 read/write, 관리자 정책은 추후 추가
-- ─────────────────────────────────────────────────────

-- 업로드: 본인 폴더에만
CREATE POLICY "biz_license_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-licenses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 조회: 본인 파일만 (관리자 정책은 Phase 2 이상에서 추가)
CREATE POLICY "biz_license_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-licenses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 삭제: 본인 파일만 (재업로드 시)
CREATE POLICY "biz_license_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-licenses'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 메모: 관리자 승인 흐름은 Phase 2+ 에서 별도 어드민 페이지 + 정책 추가
-- 지금은 신청만 받음 (PENDING 상태로 저장)
-- ============================================================
