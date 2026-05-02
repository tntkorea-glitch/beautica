-- ============================================================
-- 15. 개인일정 (캘린더 개인 블록)
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  staff_id    UUID REFERENCES staff(id) ON DELETE CASCADE,  -- null = 원장(샵 오너)
  title       TEXT NOT NULL,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN NOT NULL DEFAULT false,
  color       TEXT NOT NULL DEFAULT '#9ca3af',  -- hex 색상
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_events_shop_start ON personal_events(shop_id, start_at);

COMMENT ON TABLE personal_events IS '캘린더 개인일정 (예약 외 블록 — 휴무, 개인 약속 등)';
