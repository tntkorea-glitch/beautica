-- ============================================================
-- 20. 예약 취소/환불 — point_transactions type 확장
-- 실행 위치: Supabase SQL Editor
-- ============================================================

-- REFUND_CANCEL: 취소 시 포인트 복원 (양수 = 사용분 반환, 음수 = 적립분 회수)
ALTER TABLE point_transactions
  DROP CONSTRAINT IF EXISTS point_transactions_type_check;

ALTER TABLE point_transactions
  ADD CONSTRAINT point_transactions_type_check CHECK (type IN (
    'EARN_BOOKING',    -- 예약 완료 후 시술 금액 기준 적립
    'EARN_DEPOSIT',    -- 예약금 결제 시 즉시 적립
    'SPEND_TNTMALL',   -- tnt-mall 주문 차감
    'SPEND_BEAUTICA',  -- 예약금 포인트 사용 차감
    'EXPIRE',          -- 유효기간 만료 차감
    'ADMIN_ADJUST',    -- 관리자 수동 조정
    'REFUND_CANCEL'    -- 예약 취소 시 포인트 복원 (양수) 또는 적립분 회수 (음수)
  ));
