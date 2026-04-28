-- ============================================================
-- Phase 1 schema 확장 (2026-04-28)
-- 벤치마킹 (공비서/콜라보/핸드SOS/반반노트/네이버) + 사용자 워크플로우 반영
--
-- 추가:
--   1. staff — 디자이너/스태프 (shop_users 와 별개, 매출 귀속 단위)
--   2. bookings.staff_id
--   3. service_passes — 회수권/선불권/회원권
--   4. consultation_charts — 시술 전 상담차트
--   5. consent_form_templates / consent_forms — 동의서 템플릿/서명
--   6. service_records — 시술 기록 (전후 사진 + 색소 배합)
--   7. Storage bucket: customer-photos
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. staff (디자이너/스태프)
-- ─────────────────────────────────────────────────────
CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  display_color   TEXT NOT NULL DEFAULT '#84a59d',     -- 캘린더 색상
  photo_url       TEXT,
  position        TEXT,                                  -- 직책 (원장/부원장/스탭)
  commission_rate NUMERIC(5,2),                          -- 기본 커미션 %
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  display_order   INT     NOT NULL DEFAULT 0,
  user_id         UUID REFERENCES auth.users(id),       -- 본인 계정 (앱 사용 시)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_shop ON staff(shop_id);

-- ─────────────────────────────────────────────────────
-- 2. bookings 에 staff 매핑
-- ─────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff ON bookings(staff_id);

-- ─────────────────────────────────────────────────────
-- 3. service_passes (회수권/선불권/회원권)
-- ─────────────────────────────────────────────────────
CREATE TABLE service_passes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id        UUID REFERENCES services(id),          -- 특정 시술용 or NULL(전체)

  pass_type         TEXT NOT NULL CHECK (pass_type IN ('COUNT', 'PREPAID', 'MEMBERSHIP')),
  -- COUNT      : 회수권 (예: 10회권)
  -- PREPAID    : 선불권 (예: 50만원 충전)
  -- MEMBERSHIP : 회원권 (월/년 정액)

  total_count       INT,                                   -- COUNT 용
  remaining_count   INT,
  prepaid_amount    INT,                                   -- PREPAID 용 (원)
  remaining_amount  INT,
  expires_at        TIMESTAMPTZ,

  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_passes_customer ON service_passes(shop_id, customer_id);
CREATE INDEX idx_passes_active   ON service_passes(shop_id) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────
-- 4. consultation_charts (시술 전 상담 차트)
-- (기존 consultations 는 외부 lead 용으로 유지, 별개)
-- ─────────────────────────────────────────────────────
CREATE TABLE consultation_charts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id            UUID REFERENCES bookings(id),
  staff_id              UUID REFERENCES staff(id),

  visit_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 의료/피부 정보
  skin_type             TEXT,
  allergies             TEXT,
  medical_history       TEXT,
  medications           TEXT,

  -- 시술 관련
  previous_treatments   TEXT,
  desired_design        TEXT,
  reference_photo_urls  TEXT[] DEFAULT '{}',

  -- 운영자 평가/메모
  shop_assessment       TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_charts_customer ON consultation_charts(shop_id, customer_id);
CREATE INDEX idx_charts_booking  ON consultation_charts(booking_id);

-- ─────────────────────────────────────────────────────
-- 5. consent_form_templates (매장별 동의서 템플릿)
-- ─────────────────────────────────────────────────────
CREATE TABLE consent_form_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,                               -- 동의서 본문 (markdown)
  version     INT  NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_templates_shop ON consent_form_templates(shop_id);

-- ─────────────────────────────────────────────────────
-- 6. consent_forms (고객 서명 받은 동의서)
-- ─────────────────────────────────────────────────────
CREATE TABLE consent_forms (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                  UUID NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  customer_id              UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id               UUID REFERENCES bookings(id),
  template_id              UUID NOT NULL REFERENCES consent_form_templates(id),
  template_version         INT  NOT NULL,                  -- 서명 시점 버전 보존
  signed_content_snapshot  TEXT NOT NULL,                  -- 서명 시점 본문 스냅샷 (템플릿 변경 후에도 보존)

  signature_url            TEXT,                            -- 서명 이미지 (Storage)
  signature_method         TEXT CHECK (signature_method IN ('IN_STORE', 'REMOTE_LINK')),
  signature_token          TEXT UNIQUE,                     -- REMOTE_LINK 용 (anon 접근 토큰)
  token_expires_at         TIMESTAMPTZ,
  signed_at                TIMESTAMPTZ,
  signer_name              TEXT,                            -- 서명자 이름 (확인용)

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_forms_customer ON consent_forms(shop_id, customer_id);
CREATE INDEX idx_consent_forms_booking  ON consent_forms(booking_id);
CREATE INDEX idx_consent_forms_token    ON consent_forms(signature_token) WHERE signature_token IS NOT NULL;

-- ─────────────────────────────────────────────────────
-- 7. service_records (시술 기록 + 전후 사진)
-- ─────────────────────────────────────────────────────
CREATE TABLE service_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES bookings(id),
  staff_id            UUID REFERENCES staff(id),
  service_id          UUID REFERENCES services(id),

  performed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 사진
  before_photo_urls   TEXT[] DEFAULT '{}',
  after_photo_urls    TEXT[] DEFAULT '{}',

  -- 시술 디테일 (반반노트 핵심)
  formula             TEXT,                                 -- 색소 배합 / 염색 색조합
  used_products       JSONB,                                -- 사용 자재 (tnt-mall Product.prodCd 배열 가능)
  techniques          TEXT,                                 -- 사용한 기법

  notes               TEXT,                                 -- 시술 후 메모

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_records_customer ON service_records(shop_id, customer_id);
CREATE INDEX idx_records_booking  ON service_records(booking_id);
CREATE INDEX idx_records_staff    ON service_records(shop_id, staff_id);

-- ─────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────────────
CREATE TRIGGER staff_set_updated_at                  BEFORE UPDATE ON staff                  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_passes_set_updated_at         BEFORE UPDATE ON service_passes         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER consultation_charts_set_updated_at    BEFORE UPDATE ON consultation_charts    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER consent_form_templates_set_updated_at BEFORE UPDATE ON consent_form_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_records_set_updated_at        BEFORE UPDATE ON service_records        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────
-- RLS 활성화
-- ─────────────────────────────────────────────────────
ALTER TABLE staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_passes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_charts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records        ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────
-- RLS 정책 — 모두 본인 샵 데이터만 (current_user_shop_ids 함수 활용)
-- consent_forms 의 anon 서명 흐름은 별도 정책 (REMOTE_LINK 토큰 기반)
-- ─────────────────────────────────────────────────────
CREATE POLICY staff_all_own ON staff FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY passes_all_own ON service_passes FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY charts_all_own ON consultation_charts FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY consent_templates_all_own ON consent_form_templates FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY consent_forms_all_own ON consent_forms FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY records_all_own ON service_records FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

-- 동의서 anon 서명: signature_token 기반 SELECT/UPDATE 허용 (별도 함수로 검증)
-- 실제 anon 서명 흐름 페이지 만들 때 추가 정책 부여 예정.

-- ─────────────────────────────────────────────────────
-- 8. Storage bucket: customer-photos
-- 시술 전후 사진, 동의서 서명 이미지, 참고 이미지 등
-- 경로 컨벤션: {shop_id}/{customer_id}/{record_id}-{n}.jpg
-- ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-photos',
  'customer-photos',
  FALSE,
  20 * 1024 * 1024,                                       -- 20MB (시술 사진 고화질 가능)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- 운영자(shop_users) 만 자기 샵의 customer-photos 폴더 read/write
-- 경로 첫 segment 가 자기 shop_id 여야 함
CREATE POLICY "customer_photos_select_own_shop"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM shop_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customer_photos_insert_own_shop"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM shop_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customer_photos_delete_own_shop"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'customer-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT shop_id::text FROM shop_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 메모: 페이지/UI 구현은 SQL 적용 후 단계적
--   1단계: staff 등록/관리 + bookings 에 staff 선택
--   2단계: 고객 상세에 "상담차트 + 동의서 + 시술기록" 탭 (히스토리 형태)
--   3단계: 동의서 템플릿 편집 + 서명 받기 (in-store 직접 / 모바일 링크)
--   4단계: 회수권/선불권 관리 + 결제/차감 흐름
-- ============================================================
