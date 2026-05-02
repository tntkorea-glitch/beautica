-- migration 18: D-1 예약 리마인더 설정
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS solapi_template_reminder TEXT;
