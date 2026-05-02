-- ============================================================
-- 12. 뷰티샵 구독 관리 (효성CMS 월정액 청구)
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'FREE',   -- FREE | BASIC | PRO
  monthly_fee     INTEGER NOT NULL DEFAULT 0,      -- 원
  payment_kind    TEXT NOT NULL DEFAULT 'CMS',     -- CARD | CMS
  hms_member_id   TEXT,                            -- 효성CMS memberId
  status          TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUSPENDED | CANCELLED
  billing_day     INTEGER NOT NULL DEFAULT 25,     -- 매월 n일 청구
  next_billing_at TIMESTAMPTZ,
  last_billed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_billing_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id),
  subscription_id UUID NOT NULL REFERENCES shop_subscriptions(id),
  transaction_id  TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  points_used     INTEGER NOT NULL DEFAULT 0,
  charged_amount  INTEGER NOT NULL,
  payment_kind    TEXT NOT NULL,
  status          TEXT NOT NULL,     -- SUCCESS | FAILED | POINT_COVERED
  hms_response    JSONB,
  billed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE shop_subscriptions       IS '뷰티샵 월정액 구독 (효성CMS)';
COMMENT ON TABLE subscription_billing_logs IS '구독 청구 이력';
