-- ============================================================
-- 14. 샵 계좌 정보 (무통장입금용)
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS bank_name        TEXT,   -- 은행명 (예: 국민은행, 카카오뱅크)
  ADD COLUMN IF NOT EXISTS bank_code        TEXT,   -- 은행 코드 (BankLinks 컴포넌트 키)
  ADD COLUMN IF NOT EXISTS bank_account_no  TEXT,   -- 계좌번호 (하이픈 포함 가능)
  ADD COLUMN IF NOT EXISTS bank_holder      TEXT;   -- 예금주

COMMENT ON COLUMN shops.bank_name       IS '무통장입금 은행명 (표시용)';
COMMENT ON COLUMN shops.bank_code       IS '은행 코드 — BankLinks 딥링크 매핑용 (kb/shinhan/woori/hana/nh/ibk/kakao/toss/k)';
COMMENT ON COLUMN shops.bank_account_no IS '무통장입금 계좌번호';
COMMENT ON COLUMN shops.bank_holder     IS '무통장입금 예금주';
