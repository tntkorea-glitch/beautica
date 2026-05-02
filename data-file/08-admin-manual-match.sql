-- ============================================================
-- 관리자 수동 매칭 RPC: beautica_admin_manual_match
-- 실행 위치: Supabase SQL Editor (멱등 — CREATE OR REPLACE)
--
-- 배경:
--   자동 매칭(점수화) 임계값을 못 넘은 케이스 — 회원이 신규로 등록했지만
--   실제로는 전산에 거래처가 있는 경우 (예: 람페로마 → 배정아 이름으로 등록).
--   admin 이 거래처를 직접 검색해서 강제 매핑.
--
-- 동작:
--   - 대상 Partner 의 CustomerCompany 가 있으면 supabaseUserId/tier 갱신.
--     (다른 user 에 매핑됐으면 CONFLICT_OTHER_USER_MAPPED hard-block)
--   - 대상 Partner 에 CC 가 없으면 CC + Branch 신규 생성.
--   - 기존 shops.customer_company_id 가 다른 CC 면 그 CC 의 supabaseUserId 만 NULL 처리.
--     (CC 자체는 보존 — 데이터 손실 방지)
--   - shops 매핑 + match_status='APPROVED' + tier_upgrade 동시 처리.
-- ============================================================

CREATE OR REPLACE FUNCTION beautica_admin_manual_match(
  p_shop_id            UUID,
  p_admin_id           UUID,
  p_target_partner_id  TEXT,
  p_target_tier        INT DEFAULT 2
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_user        UUID;
  v_owner_email       TEXT;
  v_shop_business_no  TEXT;
  v_shop_company_name TEXT;
  v_old_cc_id         TEXT;
  v_target_cc_id      TEXT;
  v_target_cc_user    UUID;
  v_partner_name      TEXT;
  v_partner_biz       TEXT;
  v_branch_id         TEXT;
  v_user_id           TEXT;
  v_orphan_partners   TEXT[];
BEGIN
  -- 1) shop OWNER + 정보
  SELECT user_id INTO v_owner_user
  FROM shop_users
  WHERE shop_id = p_shop_id AND role = 'OWNER';
  IF v_owner_user IS NULL THEN
    RETURN jsonb_build_object('error', 'NO_OWNER');
  END IF;

  SELECT business_number, name, customer_company_id
  INTO v_shop_business_no, v_shop_company_name, v_old_cc_id
  FROM shops
  WHERE id = p_shop_id;

  IF v_shop_company_name IS NULL THEN
    RETURN jsonb_build_object('error', 'SHOP_NOT_FOUND');
  END IF;

  SELECT email INTO v_owner_email FROM auth.users WHERE id = v_owner_user;

  -- 2) 대상 Partner 검증
  SELECT name, "businessNo" INTO v_partner_name, v_partner_biz
  FROM "Partner" WHERE id = p_target_partner_id;
  IF v_partner_name IS NULL THEN
    RETURN jsonb_build_object('error', 'NO_PARTNER');
  END IF;

  -- 3) 대상 CustomerCompany 조회 + 충돌 검증
  SELECT id, "supabaseUserId" INTO v_target_cc_id, v_target_cc_user
  FROM "CustomerCompany"
  WHERE "partnerId" = p_target_partner_id
  LIMIT 1;

  IF v_target_cc_id IS NOT NULL
     AND v_target_cc_user IS NOT NULL
     AND v_target_cc_user <> v_owner_user THEN
    RETURN jsonb_build_object('error', 'CONFLICT_OTHER_USER_MAPPED');
  END IF;

  -- 4) ⚠ 옛 CC/Partner 정리 (UNIQUE 제약 회피)
  --    a) unlink 대상 CC 들에 묶인 synthetic Partner 들을 캡쳐
  SELECT array_agg("partnerId") INTO v_orphan_partners
  FROM "CustomerCompany"
  WHERE "supabaseUserId" = v_owner_user
    AND id IS DISTINCT FROM v_target_cc_id
    AND "partnerId" IS NOT NULL;

  --    b) CC supabaseUserId NULL 처리 (UNIQUE 제약 회피)
  UPDATE "CustomerCompany"
  SET "supabaseUserId" = NULL,
      "updatedAt"      = NOW()
  WHERE "supabaseUserId" = v_owner_user
    AND id IS DISTINCT FROM v_target_cc_id;

  --    c) synthetic Partner 의 businessNo 가 매장 사업자번호와 같으면 NULL 처리
  --       (Partner.businessNo UNIQUE 제약 회피 — 타겟 Partner 보강 전에 비워야 함)
  IF v_orphan_partners IS NOT NULL AND v_shop_business_no IS NOT NULL THEN
    UPDATE "Partner"
    SET "businessNo" = NULL,
        "updatedAt"  = NOW()
    WHERE id = ANY(v_orphan_partners)
      AND id <> p_target_partner_id
      AND "businessNo" = v_shop_business_no;
  END IF;

  -- 5) 타겟 CC: 매핑/INSERT
  IF v_target_cc_id IS NOT NULL THEN
    UPDATE "CustomerCompany"
    SET
      "supabaseUserId" = v_owner_user,
      tier             = p_target_tier,
      "customerType"   = CASE WHEN p_target_tier >= 2 THEN 'BEAUTY_SHOP'::"CustomerType" ELSE "customerType" END,
      "businessNumber" = COALESCE("businessNumber", v_shop_business_no),
      "companyName"    = COALESCE("companyName", v_shop_company_name),
      "updatedAt"      = NOW()
    WHERE id = v_target_cc_id;
  ELSE
    -- CC 신규 생성 (대상 Partner 에 CC 가 없는 경우)
    v_target_cc_id := 'c' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO "CustomerCompany" (
      id, "partnerId", tier, "customerType", "companyName",
      "businessNumber", "supabaseUserId", "createdAt", "updatedAt"
    ) VALUES (
      v_target_cc_id,
      p_target_partner_id,
      p_target_tier,
      CASE WHEN p_target_tier >= 2 THEN 'BEAUTY_SHOP'::"CustomerType" ELSE 'INDIVIDUAL'::"CustomerType" END,
      v_partner_name,
      COALESCE(v_partner_biz, v_shop_business_no),
      v_owner_user,
      NOW(),
      NOW()
    );

    -- Branch (대표지점)
    v_branch_id := 'b' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO "Branch" (
      id, "customerCompanyId", name, "isDefault", "createdAt", "updatedAt"
    ) VALUES (
      v_branch_id, v_target_cc_id, '본점', true, NOW(), NOW()
    );

    -- User (이메일 기반 멱등 — 이미 있으면 skip, customerCompanyId 보호)
    IF v_owner_email IS NOT NULL THEN
      SELECT id INTO v_user_id FROM "User" WHERE email = v_owner_email LIMIT 1;
      IF v_user_id IS NULL THEN
        v_user_id := 'u' || replace(gen_random_uuid()::text, '-', '');
        INSERT INTO "User" (
          id, email, name, role, "memberLevelId",
          "customerCompanyId", "branchId", "profileCompleted",
          "createdAt", "updatedAt"
        ) VALUES (
          v_user_id, v_owner_email, v_shop_company_name, 'USER', 7,
          v_target_cc_id, v_branch_id, false,
          NOW(), NOW()
        );
      END IF;
    END IF;
  END IF;

  -- 6) Partner 사업자번호 보강
  IF v_shop_business_no IS NOT NULL THEN
    UPDATE "Partner"
    SET "businessNo" = v_shop_business_no,
        "updatedAt"  = NOW()
    WHERE id = p_target_partner_id
      AND ("businessNo" IS NULL OR "businessNo" = '');
  END IF;

  -- 7) shops 매핑 + 매칭 승인
  UPDATE shops
  SET
    customer_company_id      = v_target_cc_id,
    matched_partner_id       = p_target_partner_id,
    tier                     = p_target_tier,
    match_status             = 'APPROVED',
    match_score              = NULL,
    match_signals            = NULL,
    match_requested_at       = COALESCE(match_requested_at, NOW()),
    match_reviewed_at        = NOW(),
    match_reviewed_by        = p_admin_id,
    match_reject_reason      = NULL,
    tier_upgrade_status      = CASE WHEN tier_upgrade_status = 'PENDING' THEN 'APPROVED' ELSE tier_upgrade_status END,
    tier_upgrade_reviewed_at = CASE WHEN tier_upgrade_status = 'PENDING' THEN NOW() ELSE tier_upgrade_reviewed_at END,
    tier_upgrade_reviewed_by = CASE WHEN tier_upgrade_status = 'PENDING' THEN p_admin_id ELSE tier_upgrade_reviewed_by END
  WHERE id = p_shop_id;

  RETURN jsonb_build_object(
    'ok', true,
    'customer_company_id', v_target_cc_id,
    'partner_id', p_target_partner_id,
    'tier', p_target_tier,
    'created_new_cc', v_branch_id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION beautica_admin_manual_match(UUID, UUID, TEXT, INT) TO authenticated, service_role;
