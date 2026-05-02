/** 결제 방법 한국어 라벨 */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "무통장 입금",
  CARD: "카드",
  KAKAO_PAY: "카카오페이",
  NAVER_PAY: "네이버페이",
  CREDIT: "외상",
  OTHER: "기타",
};

/** TNT KOREA 무통장 입금 계좌 정보 — 실제 값으로 업데이트 필요 */
export const TNT_BANK = {
  bank: "기업은행",
  account: "010-5247-5659",
  holder: "티엔티코리아",
  bankCode: "003",        // 은행코드 (토스 딥링크용) — IBK기업: 003
};

/**
 * 한국 주요 은행 코드 (토스 딥링크 bank 파라미터)
 * KB국민: 004, 신한: 088, 우리: 020, 하나: 081, 농협: 011
 * 기업: 003, SC제일: 023, 카카오뱅크: 090, 토스뱅크: 092
 */
