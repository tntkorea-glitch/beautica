-- ============================================================
-- 마이페이지 (`/dashboard/profile`) — user_profiles 테이블 + storage
-- 실행 위치: Supabase SQL Editor (멱등 — IF NOT EXISTS / DROP POLICY IF EXISTS)
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. user_profiles 테이블
--   - shops 의 owner_name 은 매장 원장명(매장 단위), user_profiles.display_name 은 회원 개인 이름.
--   - 알림 설정은 JSONB (Phase 3 발송 로직 붙기 전 UI 만 셋업).
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  personal_phone        TEXT,
  profile_image_path    TEXT,
  notification_channels JSONB NOT NULL DEFAULT '{"email": true, "kakao": false, "push": false}'::jsonb,
  notification_types    JSONB NOT NULL DEFAULT '{"booking": true, "consultation": true, "upgrade": true, "order": true}'::jsonb,
  deletion_requested_at TIMESTAMPTZ,
  deletion_reason       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION user_profiles_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION user_profiles_set_updated_at();

-- ─────────────────────────────────────────────────────
-- 2. RLS — 본인 행만 read/write
--   server-side 는 admin client 로 RLS 우회 (격리는 user_id 검증으로)
-- ─────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_owner_select ON user_profiles;
CREATE POLICY user_profiles_owner_select
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_profiles_owner_upsert ON user_profiles;
CREATE POLICY user_profiles_owner_upsert
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────
-- 3. profile-images storage bucket
--   파일 경로 컨벤션: {user_id}/{filename} (business-licenses 와 동일)
-- ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  FALSE,                                    -- private (signed URL 로 노출)
  5 * 1024 * 1024,                          -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "profile_image_insert_own" ON storage.objects;
CREATE POLICY "profile_image_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile_image_select_own" ON storage.objects;
CREATE POLICY "profile_image_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile_image_update_own" ON storage.objects;
CREATE POLICY "profile_image_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "profile_image_delete_own" ON storage.objects;
CREATE POLICY "profile_image_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
