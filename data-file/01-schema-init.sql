-- ============================================================
-- beautica 자체 테이블 초기 스키마 (Phase 0 - 인프라)
-- 실행 위치: Supabase SQL Editor (project: iuffpkiwarkdmddwgdwt)
--           https://supabase.com/dashboard/project/iuffpkiwarkdmddwgdwt/sql/new
-- 같은 인스턴스의 tnt-mall 테이블과 공존. 모든 자체 테이블에 RLS 강제.
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. shops — 뷰티샵 (멀티테넌트 격리 단위)
-- ─────────────────────────────────────────────────────
CREATE TABLE shops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,                      -- /<slug> 공개 예약 페이지 URL
  name                  TEXT NOT NULL,                              -- 매장명
  -- 가격 등급 (Product.tier1/2/3 컬럼과 매핑)
  --   1 = B2C 일반 (개인 소비자)
  --   2 = 일반 뷰티샵 (프리미엄, default — 대부분의 beautica 회원)
  --   3 = 대형/VIP 거래처 (특별회원)
  tier                  INT  NOT NULL DEFAULT 2 CHECK (tier BETWEEN 1 AND 3),
  business_number       TEXT,                                       -- 사업자번호 (B2B 등록 시)
  customer_company_id   TEXT,                                       -- tnt-mall CustomerCompany.id (회원 통합 매핑)
  phone                 TEXT,
  address               TEXT,
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shops_slug             ON shops(slug);
CREATE INDEX idx_shops_customer_company ON shops(customer_company_id);

-- ─────────────────────────────────────────────────────
-- 2. shop_users — 샵별 운영자 (auth.users 매핑, 다대다)
-- ─────────────────────────────────────────────────────
CREATE TABLE shop_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id)     ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'STAFF')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX idx_shop_users_user ON shop_users(user_id);
CREATE INDEX idx_shop_users_shop ON shop_users(shop_id);

-- ─────────────────────────────────────────────────────
-- 3. services — 시술 메뉴 (샵별)
-- ─────────────────────────────────────────────────────
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT,
  price_won     INT  NOT NULL,
  duration_min  INT  NOT NULL DEFAULT 60,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_shop ON services(shop_id);

-- ─────────────────────────────────────────────────────
-- 4. customers — 고객 CRM (샵별)
-- ─────────────────────────────────────────────────────
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  birthday        DATE,
  gender          TEXT CHECK (gender IN ('MALE','FEMALE','OTHER')),
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  first_visit_at  TIMESTAMPTZ,
  last_visit_at   TIMESTAMPTZ,
  visit_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_shop  ON customers(shop_id);
CREATE INDEX idx_customers_phone ON customers(shop_id, phone);

-- ─────────────────────────────────────────────────────
-- 5. bookings — 예약 (샵 수동 승인 흐름)
-- ─────────────────────────────────────────────────────
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops(id)    ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id)         ON DELETE SET NULL,
  service_id     UUID REFERENCES services(id)          ON DELETE SET NULL,

  -- 게스트 신청 (customer_id 없을 때)
  guest_name     TEXT,
  guest_phone    TEXT,

  -- 예약 시간
  start_at       TIMESTAMPTZ NOT NULL,
  end_at         TIMESTAMPTZ NOT NULL,

  -- 상태 (샵 수동 승인 흐름)
  status         TEXT NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),

  -- 메모
  customer_note  TEXT,
  shop_note      TEXT,

  -- 가격 스냅샷
  price_won      INT NOT NULL,

  -- 승인/취소 메타
  confirmed_at   TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  cancel_reason  TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_shop_time ON bookings(shop_id, start_at);
CREATE INDEX idx_bookings_customer  ON bookings(customer_id);
CREATE INDEX idx_bookings_status    ON bookings(shop_id, status);

-- ─────────────────────────────────────────────────────
-- 6. consultations — 상담 (예약 전환 가능)
-- ─────────────────────────────────────────────────────
CREATE TABLE consultations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id)      ON DELETE SET NULL,

  guest_name            TEXT,
  guest_phone           TEXT,

  category              TEXT,
  message               TEXT NOT NULL,

  status                TEXT NOT NULL DEFAULT 'NEW'
                        CHECK (status IN ('NEW','IN_PROGRESS','CLOSED')),
  shop_response         TEXT,
  responded_at          TIMESTAMPTZ,

  converted_booking_id  UUID REFERENCES bookings(id),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consultations_shop ON consultations(shop_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_set_updated_at         BEFORE UPDATE ON shops         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER services_set_updated_at      BEFORE UPDATE ON services      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at     BEFORE UPDATE ON customers     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bookings_set_updated_at      BEFORE UPDATE ON bookings      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER consultations_set_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE shops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 헬퍼 함수: 현재 인증 사용자가 속한 shop_id 목록
-- (RLS 정책 안에서 재귀 참조 방지를 위해 SECURITY DEFINER 로 정의)
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_shop_ids() RETURNS SETOF UUID AS $$
  SELECT shop_id FROM shop_users WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- RLS 정책
-- ============================================================

-- shops ────────────────────────────────────────
CREATE POLICY shops_select_own ON shops FOR SELECT
  USING (id IN (SELECT current_user_shop_ids()));

CREATE POLICY shops_update_own ON shops FOR UPDATE
  USING (id IN (SELECT current_user_shop_ids()))
  WITH CHECK (id IN (SELECT current_user_shop_ids()));

-- onboarding 시점 INSERT (인증 사용자면 OK, shop_users 도 함께 INSERT 해야 자기 것이 됨)
CREATE POLICY shops_insert_authenticated ON shops FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- shop_users ───────────────────────────────────
CREATE POLICY shop_users_select_own_shops ON shop_users FOR SELECT
  USING (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY shop_users_insert_self ON shop_users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- services ─────────────────────────────────────
CREATE POLICY services_select_own ON services FOR SELECT
  USING (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY services_modify_own ON services FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

-- customers ────────────────────────────────────
CREATE POLICY customers_all_own ON customers FOR ALL
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

-- bookings ─────────────────────────────────────
CREATE POLICY bookings_select_own ON bookings FOR SELECT
  USING (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY bookings_update_own ON bookings FOR UPDATE
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY bookings_delete_own ON bookings FOR DELETE
  USING (shop_id IN (SELECT current_user_shop_ids()));

-- 공개 예약 신청: anon 도 INSERT 가능, 단 shop 이 활성 상태여야 함
CREATE POLICY bookings_insert_anon ON bookings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND is_active = TRUE));

-- consultations ────────────────────────────────
CREATE POLICY consultations_select_own ON consultations FOR SELECT
  USING (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY consultations_update_own ON consultations FOR UPDATE
  USING (shop_id IN (SELECT current_user_shop_ids()))
  WITH CHECK (shop_id IN (SELECT current_user_shop_ids()));

CREATE POLICY consultations_insert_anon ON consultations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND is_active = TRUE));

-- ============================================================
-- 메모: 공개 예약/상담 페이지 (`/<shop-slug>`) 의 anon SELECT 권한
-- ─ shops/services 의 anon SELECT 는 별도 정책으로 분리 (Phase 1)
-- ─ slug 기반 공개 조회 + 노출 컬럼 제한 필요
-- ============================================================
