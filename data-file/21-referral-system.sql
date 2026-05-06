-- Migration 21: 추천인(Referral) 시스템
-- beautica 자체 추천 추적 + tnt-mall User.referredByUserId 연계 기반

-- 샵별 추천 코드 (8자 대문자 알파넘)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 추천으로 가입된 사용자 기록 (referee = 가입한 사람, referrer = 추천한 샵)
CREATE TABLE IF NOT EXISTS referral_signups (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_shop_id    UUID        NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  referee_supabase_id UUID        NOT NULL,   -- auth.users.id (가입한 사람)
  tnt_linked          BOOLEAN     NOT NULL DEFAULT false, -- tnt-mall User.referredByUserId 동기화 완료 여부
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_signups_referee_unique UNIQUE (referee_supabase_id)  -- 1인 1추천
);

CREATE INDEX IF NOT EXISTS referral_signups_referrer_idx ON referral_signups(referrer_shop_id);
