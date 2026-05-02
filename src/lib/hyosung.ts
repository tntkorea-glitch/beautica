/**
 * 효성CMS Web API — TypeScript wrapper for beautica
 * 용도: 뷰티샵 원장 월정액 구독 청구 (CMS 계좌이체 또는 카드)
 */

interface HmsAuth { swKey: string; custKey: string }

interface HmsModule {
  createMember(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateMember(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteMember(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  getMember(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  requestCardApproval(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  cancelCardApproval(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  requestCmsWithdrawal(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  cancelCardPartial(opts: Record<string, unknown>): Promise<Record<string, unknown>>;
  chargeWithPoints(opts: Record<string, unknown>): Promise<{
    charged: boolean; chargeAmount: number; pointsUsed: number; payment: Record<string, unknown> | null;
  }>;
  generateTransactionId(prefix?: string): string;
  lookupCmsError(code: string): { code: string; message: string; isSuccess: boolean };
  getBankName(code: string): string | null;
  isPaymentSuccess(result: Record<string, unknown>): boolean;
  BANK_CODES: Record<string, string>;
  PAYMENT_KIND: { CARD: "CARD"; CMS: "CMS" };
}

function loadHms(): HmsModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("hyosung-payment") as HmsModule;
  } catch {
    throw new Error("hyosung-payment 패키지가 설치되지 않았습니다. npm install hyosung-payment 실행 필요");
  }
}

function getAuth(): HmsAuth {
  const swKey = process.env.BEAUTICA_HMS_SW_KEY ?? "";
  const custKey = process.env.BEAUTICA_HMS_CUST_KEY ?? "";
  return { swKey, custKey };
}

function getCustId(): string {
  return process.env.BEAUTICA_HMS_CUST_ID ?? "";
}

function isTestMode(): boolean {
  return (process.env.BEAUTICA_HMS_MODE ?? "test") !== "real";
}

function isConfigured(): boolean {
  const { swKey, custKey } = getAuth();
  return !!(swKey && custKey && getCustId());
}

export interface HmsSubscriptionMember {
  memberId: string;       // 매장 slug 또는 shop_id prefix
  memberName: string;     // 원장 이름
  phone: string;
  paymentKind: "CARD" | "CMS";
  paymentNumber: string;  // 카드번호 or 계좌번호
  payerName: string;
  payerNumber: string;    // 생년월일6자리 or 사업자번호
  // CMS only
  paymentCompany?: string; // 은행코드
  paymentBankName?: string;
}

/** 구독 회원 등록 */
export async function registerSubscriptionMember(member: HmsSubscriptionMember) {
  if (!isConfigured()) throw new Error("효성CMS 환경변수 미설정");
  const hms = loadHms();
  return hms.createMember({
    auth: getAuth(), custId: getCustId(),
    member, testMode: isTestMode(),
  });
}

/** 구독 회원 정보 조회 */
export async function getSubscriptionMember(memberId: string) {
  if (!isConfigured()) return null;
  try {
    const hms = loadHms();
    return await hms.getMember({
      auth: getAuth(), custId: getCustId(),
      memberId, testMode: isTestMode(),
    });
  } catch {
    return null;
  }
}

/** 구독 회원 삭제 */
export async function deleteSubscriptionMember(memberId: string) {
  if (!isConfigured()) throw new Error("효성CMS 환경변수 미설정");
  const hms = loadHms();
  return hms.deleteMember({
    auth: getAuth(), custId: getCustId(),
    memberId, testMode: isTestMode(),
  });
}

export interface ChargeParams {
  memberId: string;
  monthlyFee: number;
  remainingPoints?: number;
  paymentKind: "CARD" | "CMS";
  paymentDate?: string; // YYYYMMDD (CMS only)
}

/** 월정액 청구 (포인트 차감 후 실청구) */
export async function chargeMonthlyFee(params: ChargeParams) {
  if (!isConfigured()) throw new Error("효성CMS 환경변수 미설정");
  const hms = loadHms();
  const txId = hms.generateTransactionId("BTC");
  return hms.chargeWithPoints({
    auth: getAuth(), custId: getCustId(),
    transactionId: txId,
    memberId: params.memberId,
    monthlyFee: params.monthlyFee,
    remainingPoints: params.remainingPoints ?? 0,
    paymentKind: params.paymentKind,
    paymentDate: params.paymentDate,
    testMode: isTestMode(),
  });
}

export function getBankCodes(): Record<string, string> {
  try { return loadHms().BANK_CODES; } catch { return {}; }
}
export { isConfigured, isTestMode };
