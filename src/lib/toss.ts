/**
 * 토스페이먼츠 서버사이드 API 헬퍼
 * Canonical source: D:/dev/shared-social-publisher/src/toss-payment.ts
 */

const TOSS_API = 'https://api.tosspayments.com/v1';

function authHeader(): { Authorization: string } {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error('TOSS_SECRET_KEY 환경변수가 없습니다');
  return { Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}` };
}

export interface TossPaymentResult {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string;
  totalAmount: number;
  approvedAt: string;
  card?: { number: string; issuerCode: string; acquirerCode: string };
  easyPay?: { provider: string };
}

/** 결제 승인 (successUrl 리다이렉트 후 서버에서 호출) */
export async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossPaymentResult> {
  const res = await fetch(`${TOSS_API}/payments/confirm`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message ?? '결제 승인 실패');
    (err as NodeJS.ErrnoException).code = data.code;
    throw err;
  }
  return data as TossPaymentResult;
}

/** 결제 취소 (전액 or 부분) */
export async function cancelPayment(params: {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}): Promise<void> {
  const { paymentKey, cancelReason, cancelAmount } = params;
  const body: Record<string, unknown> = { cancelReason };
  if (cancelAmount !== undefined) body.cancelAmount = cancelAmount;

  const res = await fetch(`${TOSS_API}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const data = await res.json();
    const err = new Error(data.message ?? '결제 취소 실패');
    (err as NodeJS.ErrnoException).code = data.code;
    throw err;
  }
}

/** 결제 단건 조회 */
export async function getPayment(paymentKey: string): Promise<TossPaymentResult> {
  const res = await fetch(`${TOSS_API}/payments/${paymentKey}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message ?? '결제 조회 실패');
    (err as NodeJS.ErrnoException).code = data.code;
    throw err;
  }
  return data as TossPaymentResult;
}
