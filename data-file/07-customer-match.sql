-- ============================================================
-- 회원가입 시 tnt-mall 거래처 매칭 (점수화 + 마스킹 후보 노출)
-- 실행 위치: Supabase SQL Editor
--
-- 배경:
--   tnt-mall 의 기존 거래처 90%+ 가 사업자번호 없이 등록되어 있음.
--   → 사업자번호 단일 매칭 불가능. 상호/대표자/전화 복합 신호 점수화 필요.
--
-- 흐름:
--   onboarding (상호 + 대표자 + 휴대폰 [+ 사업자번호 옵션] + 주소)
--      ↓ beautica_match_candidates RPC
--   후보 0건 → 신규 거래처 등록 (기존 흐름)
--   후보 N건 → 마스킹 후보 노출 → 회원 선택 → admin 큐
-- ============================================================

-- ─────────────────────────────────────────────────────
-- 1. shops 컬럼 추가 (대표자명 + 매칭 메타)
-- ─────────────────────────────────────────────────────
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS owner_name          TEXT,
  ADD COLUMN IF NOT EXISTS matched_partner_id  TEXT,
  ADD COLUMN IF NOT EXISTS match_score         INT,
  ADD COLUMN IF NOT EXISTS match_signals       JSONB,
  ADD COLUMN IF NOT EXISTS match_status        TEXT
    CHECK (match_status IS NULL OR match_status IN ('PENDING_REVIEW','APPROVED','REJECTED')),
  ADD COLUMN IF NOT EXISTS match_requested_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS match_reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS match_reviewed_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS match_reject_reason TEXT;

-- 매칭 신청 대기열 인덱스 (admin)
CREATE INDEX IF NOT EXISTS idx_shops_match_pending
  ON shops(match_requested_at)
  WHERE match_status = 'PENDING_REVIEW';

-- ─────────────────────────────────────────────────────
-- 2. pg_trgm extension + 정규화 함수
-- ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 상호명 정규화 (공백/괄호/하이픈/점/슬래시 제거 + 소문자)
CREATE OR REPLACE FUNCTION normalize_company_name(s TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT lower(regexp_replace(coalesce(s, ''), '[\s\-_\.\(\)\[\]\/]+', '', 'g'))
$$;

-- 휴대폰/전화 정규화 (숫자만)
CREATE OR REPLACE FUNCTION normalize_phone(s TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(s, ''), '[^0-9]', '', 'g')
$$;

-- ─────────────────────────────────────────────────────
-- 3. Partner 인덱스 (매칭 검색 성능)
-- ─────────────────────────────────────────────────────
-- Partner 테이블의 컬럼: name, businessNo, representative, mobile, phone, address1, zipcode

-- 상호명 trigram (정규화 expression index)
CREATE INDEX IF NOT EXISTS partner_name_normalized_trgm_idx
  ON "Partner" USING gin (normalize_company_name(name) gin_trgm_ops);

-- 사업자번호 (이미 unique 라 인덱스 자동, 안전장치)
CREATE INDEX IF NOT EXISTS partner_business_no_idx
  ON "Partner" ("businessNo")
  WHERE "businessNo" IS NOT NULL;

-- 휴대폰 정규화 expression
CREATE INDEX IF NOT EXISTS partner_mobile_normalized_idx
  ON "Partner" (normalize_phone(mobile))
  WHERE mobile IS NOT NULL;

-- 대표자명
CREATE INDEX IF NOT EXISTS partner_representative_idx
  ON "Partner" (representative)
  WHERE representative IS NOT NULL;

-- ─────────────────────────────────────────────────────
-- 4. 매칭 RPC: beautica_match_candidates
--   입력: 사업자번호(옵션) + 상호 + 대표자 + 휴대폰 + user_id (충돌 검증용)
--   출력: 후보 N건 (점수 ≥ 60 AND 상호 점수 ≥ 25, 또는 사업자번호 일치)
--   마스킹: 대표자/사업자번호/휴대폰/주소 부분 가림
--
-- 시그니처 변경 이력 (멱등 재배포 위해 옛 버전 DROP):
--   - 2026-04-29 초기: (TEXT, TEXT, TEXT, TEXT, INT)
--   - 2026-04-30: p_user_id UUID 추가 — service_role 호출 시 auth.uid() 가 NULL 이라 충돌 검증 불가했음
-- ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS beautica_match_candidates(TEXT, TEXT, TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS beautica_request_match(UUID, TEXT, INT, JSONB);

CREATE OR REPLACE FUNCTION beautica_match_candidates(
  p_business_number TEXT,
  p_company_name    TEXT,
  p_owner_name      TEXT,
  p_mobile          TEXT,
  p_user_id         UUID DEFAULT NULL,
  p_limit           INT DEFAULT 5
)
RETURNS TABLE (
  partner_id              TEXT,
  customer_company_id     TEXT,
  partner_name            TEXT,
  representative_masked   TEXT,
  business_no_masked      TEXT,
  mobile_masked           TEXT,
  address_short           TEXT,
  registered_at           TIMESTAMPTZ,
  score                   INT,
  signals                 TEXT[],
  already_mapped_to_other BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  norm_name   TEXT := normalize_company_name(p_company_name);
  norm_mobile TEXT := normalize_phone(p_mobile);
  norm_biz    TEXT := regexp_replace(coalesce(p_business_number, ''), '[^0-9]', '', 'g');
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      p.id   AS pid,
      p.name AS pname,
      p.representative,
      p."businessNo" AS biz_no,
      p.mobile,
      p.zipcode,
      p.address1,
      p."createdAt"::timestamptz AS pcreated,
      cc.id          AS cc_id,
      cc."supabaseUserId" AS cc_user,
      -- 점수
      (CASE WHEN norm_biz <> '' AND regexp_replace(coalesce(p."businessNo",''), '[^0-9]', '', 'g') = norm_biz THEN 100 ELSE 0 END) +
      (CASE WHEN norm_name <> '' AND normalize_company_name(p.name) = norm_name THEN 50
            WHEN norm_name <> '' AND similarity(normalize_company_name(p.name), norm_name) >= 0.7 THEN 25
            ELSE 0 END) +
      (CASE WHEN coalesce(p_owner_name,'') <> '' AND p.representative = p_owner_name THEN 30 ELSE 0 END) +
      (CASE WHEN norm_mobile <> '' AND normalize_phone(p.mobile) = norm_mobile THEN 30 ELSE 0 END)
        AS sc,
      -- 신호 배열
      ARRAY_REMOVE(ARRAY[
        CASE WHEN norm_biz <> '' AND regexp_replace(coalesce(p."businessNo",''), '[^0-9]', '', 'g') = norm_biz THEN '사업자번호 일치' END,
        CASE WHEN norm_name <> '' AND normalize_company_name(p.name) = norm_name THEN '상호 정확 일치'
             WHEN norm_name <> '' AND similarity(normalize_company_name(p.name), norm_name) >= 0.7 THEN '상호 유사' END,
        CASE WHEN coalesce(p_owner_name,'') <> '' AND p.representative = p_owner_name THEN '대표자명 일치' END,
        CASE WHEN norm_mobile <> '' AND normalize_phone(p.mobile) = norm_mobile THEN '휴대폰 일치' END
      ], NULL) AS sigs,
      -- 상호 점수 (advisor 1번: 상호 신호 없이 통과 차단)
      (CASE WHEN norm_name <> '' AND normalize_company_name(p.name) = norm_name THEN 50
            WHEN norm_name <> '' AND similarity(normalize_company_name(p.name), norm_name) >= 0.7 THEN 25
            ELSE 0 END) AS name_sc
    FROM "Partner" p
    LEFT JOIN "CustomerCompany" cc ON cc."partnerId" = p.id
    WHERE
      p.type IN ('CUSTOMER', 'BOTH')
      AND (
        -- 휴리스틱 필터: 검색 부담 줄이기 (점수 계산 candidate set)
        (norm_biz <> '' AND regexp_replace(coalesce(p."businessNo",''), '[^0-9]', '', 'g') = norm_biz)
        OR (norm_name <> '' AND similarity(normalize_company_name(p.name), norm_name) >= 0.5)
        OR (coalesce(p_owner_name,'') <> '' AND p.representative = p_owner_name)
        OR (norm_mobile <> '' AND normalize_phone(p.mobile) = norm_mobile)
      )
  )
  SELECT
    s.pid,
    s.cc_id,
    s.pname,
    -- 대표자명 마스킹 (홍길동 → 홍**)
    CASE
      WHEN s.representative IS NULL OR s.representative = '' THEN NULL
      WHEN char_length(s.representative) <= 1 THEN s.representative
      ELSE substring(s.representative, 1, 1) || repeat('*', char_length(s.representative) - 1)
    END,
    -- 사업자번호 마스킹 (123-45-6789 → 123-45-****)
    CASE
      WHEN s.biz_no IS NULL OR s.biz_no = '' THEN NULL
      ELSE regexp_replace(s.biz_no, '([0-9]{4})$', '****')
    END,
    -- 휴대폰 마스킹 (010-1234-5678 → 010-1234-**78)
    CASE
      WHEN s.mobile IS NULL OR s.mobile = '' THEN NULL
      ELSE regexp_replace(s.mobile, '([0-9]{2})([0-9]{2})$', '**\2')
    END,
    -- 주소 시/도 + 시/군/구만 (서울특별시 강남구 ***)
    CASE
      WHEN s.address1 IS NULL OR s.address1 = '' THEN NULL
      ELSE (
        SELECT string_agg(part, ' ')
        FROM (
          SELECT part
          FROM unnest(string_to_array(s.address1, ' ')) WITH ORDINALITY t(part, idx)
          WHERE idx <= 2
        ) sub
      ) || ' ***'
    END,
    s.pcreated,
    s.sc,
    s.sigs,
    -- 충돌 케이스: 이미 다른 supabase user 에 매핑된 거래처
    (s.cc_user IS NOT NULL AND p_user_id IS NOT NULL AND s.cc_user <> p_user_id) AS conflict
  FROM scored s
  WHERE
    -- 임계값: 사업자번호 일치(>=100) OR (>=60 AND 상호 점수 >= 25)
    s.sc >= 100
    OR (s.sc >= 60 AND s.name_sc >= 25)
  ORDER BY s.sc DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION beautica_match_candidates(TEXT, TEXT, TEXT, TEXT, UUID, INT) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 5. 매칭 신청 RPC: beautica_request_match
--   회원이 후보 선택 후 호출. shops.matched_partner_id 등 채움.
--   충돌 케이스 (이미 다른 user 에 매핑) 는 hard-block.
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION beautica_request_match(
  p_shop_id      UUID,
  p_user_id      UUID,
  p_partner_id   TEXT,
  p_score        INT,
  p_signals      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner    BOOLEAN;
  v_cc_user  UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'UNAUTHENTICATED');
  END IF;

  -- shop OWNER 검증
  SELECT EXISTS(
    SELECT 1 FROM shop_users
    WHERE shop_id = p_shop_id AND user_id = p_user_id AND role = 'OWNER'
  ) INTO v_owner;

  IF NOT v_owner THEN
    RETURN jsonb_build_object('error', 'NOT_SHOP_OWNER');
  END IF;

  -- 충돌 검증 (advisor: 다른 user 매핑 시 hard-block)
  SELECT cc."supabaseUserId" INTO v_cc_user
  FROM "CustomerCompany" cc
  WHERE cc."partnerId" = p_partner_id;

  IF v_cc_user IS NOT NULL AND v_cc_user <> p_user_id THEN
    RETURN jsonb_build_object('error', 'CONFLICT_OTHER_USER_MAPPED');
  END IF;

  UPDATE shops
  SET
    matched_partner_id  = p_partner_id,
    match_score         = p_score,
    match_signals       = p_signals,
    match_status        = 'PENDING_REVIEW',
    match_requested_at  = NOW(),
    match_reviewed_at   = NULL,
    match_reviewed_by   = NULL,
    match_reject_reason = NULL
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION beautica_request_match(UUID, UUID, TEXT, INT, JSONB) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 6. admin 승인 RPC: beautica_approve_match
--   matched_partner_id 의 CustomerCompany 에 supabaseUserId/tier 매핑.
--   사업자등록증이 있으면 동시에 tier_upgrade 도 APPROVED 처리.
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION beautica_approve_match(
  p_shop_id   UUID,
  p_admin_id  UUID,
  p_target_tier INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id  TEXT;
  v_cc_id       TEXT;
  v_owner_user  UUID;
  v_business_no TEXT;
  v_company     TEXT;
  v_tier        INT;
BEGIN
  -- shop + matched partner 조회
  SELECT
    s.matched_partner_id, s.business_number, s.name,
    coalesce(p_target_tier, CASE WHEN s.tier_upgrade_status = 'PENDING' THEN 2 ELSE s.tier END)
  INTO v_partner_id, v_business_no, v_company, v_tier
  FROM shops s
  WHERE s.id = p_shop_id AND s.match_status = 'PENDING_REVIEW';

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_PENDING');
  END IF;

  -- shop owner
  SELECT user_id INTO v_owner_user
  FROM shop_users
  WHERE shop_id = p_shop_id AND role = 'OWNER';

  IF v_owner_user IS NULL THEN
    RETURN jsonb_build_object('error', 'NO_OWNER');
  END IF;

  -- target CustomerCompany
  SELECT id INTO v_cc_id
  FROM "CustomerCompany"
  WHERE "partnerId" = v_partner_id;

  IF v_cc_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NO_CUSTOMER_COMPANY');
  END IF;

  -- 충돌 재검증
  IF EXISTS(
    SELECT 1 FROM "CustomerCompany"
    WHERE "partnerId" = v_partner_id
      AND "supabaseUserId" IS NOT NULL
      AND "supabaseUserId" <> v_owner_user
  ) THEN
    RETURN jsonb_build_object('error', 'CONFLICT_OTHER_USER_MAPPED');
  END IF;

  -- 1) tnt-mall: CustomerCompany 매핑 + tier 업데이트
  UPDATE "CustomerCompany"
  SET
    "supabaseUserId" = v_owner_user,
    tier             = v_tier,
    "customerType"   = CASE WHEN v_tier >= 2 THEN 'BEAUTY_SHOP'::"CustomerType" ELSE "customerType" END,
    "businessNumber" = coalesce("businessNumber", v_business_no),
    "companyName"    = coalesce("companyName", v_company),
    "updatedAt"      = NOW()
  WHERE id = v_cc_id;

  -- 2) tnt-mall: Partner 사업자번호 보강 (회원이 입력했고 거래처에 비어있으면)
  UPDATE "Partner"
  SET "businessNo" = v_business_no,
      "updatedAt"  = NOW()
  WHERE id = v_partner_id
    AND v_business_no IS NOT NULL
    AND ("businessNo" IS NULL OR "businessNo" = '');

  -- 3) beautica: shops 매핑 + 매칭 승인
  UPDATE shops
  SET
    customer_company_id      = v_cc_id,
    tier                     = v_tier,
    match_status             = 'APPROVED',
    match_reviewed_at        = NOW(),
    match_reviewed_by        = p_admin_id,
    -- 등업 신청도 같이 승인 처리 (있으면)
    tier_upgrade_status      = CASE WHEN tier_upgrade_status = 'PENDING' THEN 'APPROVED' ELSE tier_upgrade_status END,
    tier_upgrade_reviewed_at = CASE WHEN tier_upgrade_status = 'PENDING' THEN NOW() ELSE tier_upgrade_reviewed_at END,
    tier_upgrade_reviewed_by = CASE WHEN tier_upgrade_status = 'PENDING' THEN p_admin_id ELSE tier_upgrade_reviewed_by END
  WHERE id = p_shop_id;

  RETURN jsonb_build_object('ok', true, 'customer_company_id', v_cc_id, 'tier', v_tier);
END;
$$;

GRANT EXECUTE ON FUNCTION beautica_approve_match(UUID, UUID, INT) TO authenticated;

-- ─────────────────────────────────────────────────────
-- 7. admin 거절 RPC: beautica_reject_match
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION beautica_reject_match(
  p_shop_id  UUID,
  p_admin_id UUID,
  p_reason   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE shops
  SET
    match_status        = 'REJECTED',
    match_reviewed_at   = NOW(),
    match_reviewed_by   = p_admin_id,
    match_reject_reason = p_reason,
    matched_partner_id  = NULL  -- 다시 매칭 시도 가능하게
  WHERE id = p_shop_id AND match_status = 'PENDING_REVIEW';

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION beautica_reject_match(UUID, UUID, TEXT) TO authenticated;
