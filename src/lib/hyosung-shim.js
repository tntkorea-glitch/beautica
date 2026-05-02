// 효성CMS 모듈 미설치 환경용 shim (Vercel 빌드 등)
const notAvailable = () => { throw new Error("hyosung-payment 미설치 — 로컬 개발 환경에서만 사용 가능"); };
module.exports = {
  createMember: notAvailable,
  updateMember: notAvailable,
  deleteMember: notAvailable,
  getMember: notAvailable,
  requestCardApproval: notAvailable,
  cancelCardApproval: notAvailable,
  requestCmsWithdrawal: notAvailable,
  cancelCardPartial: notAvailable,
  chargeWithPoints: notAvailable,
  generateTransactionId: (prefix = "TX") => `${prefix}-${Date.now()}`,
  lookupCmsError: (code) => ({ code, message: "알 수 없음", isSuccess: false }),
  getBankName: () => null,
  isPaymentSuccess: () => false,
  BANK_CODES: {},
  PAYMENT_KIND: { CARD: "CARD", CMS: "CMS" },
};
