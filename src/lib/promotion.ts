/** 시술 프로모션 가격 유틸. KST(Asia/Seoul) 기준으로 기간 평가. */

export type PromotionInput = {
  price_won: number;
  promotion_active: boolean | null;
  promotion_price_won: number | null;
  promotion_start_at: string | null; // 'YYYY-MM-DD'
  promotion_end_at: string | null;   // 'YYYY-MM-DD'
};

export type PromotionResult = {
  isPromo: boolean;
  effectivePrice: number;   // 실제 결제/표시 가격
  regularPrice: number;     // 정가
  promotionPrice: number | null;
};

/** KST 기준 오늘 'YYYY-MM-DD' */
function todayKST(): string {
  const d = new Date();
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`;
}

/** 프로모션이 현재 적용되는지 + 적용가 계산 */
export function evaluatePromotion(s: PromotionInput): PromotionResult {
  const regular = s.price_won;
  const promoPrice = s.promotion_price_won ?? null;
  const result: PromotionResult = {
    isPromo: false,
    effectivePrice: regular,
    regularPrice: regular,
    promotionPrice: promoPrice,
  };
  if (!s.promotion_active) return result;
  if (promoPrice == null || promoPrice < 0) return result;
  if (promoPrice >= regular) return result; // 정가보다 비싸거나 같으면 무의미

  const today = todayKST();
  if (s.promotion_start_at && today < s.promotion_start_at) return result;
  if (s.promotion_end_at && today > s.promotion_end_at) return result;

  result.isPromo = true;
  result.effectivePrice = promoPrice;
  return result;
}

/** 할인율(%) — 정수 반올림 */
export function discountPercent(regular: number, promo: number): number {
  if (regular <= 0) return 0;
  return Math.round(((regular - promo) / regular) * 100);
}
