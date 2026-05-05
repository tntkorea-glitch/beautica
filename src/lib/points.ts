/**
 * beautica 포인트/로열티 시스템
 * 전화번호 + 샵별 독립 포인트 (customer_ledger + point_transactions)
 * 적립률: 결제 금액의 1% (소수점 버림)
 * 유효기간: 적립 후 12개월
 */

import { createAdminClient } from '@/lib/supabase/admin';

const EARN_RATE = 0.01; // 1%
const EXPIRE_MONTHS = 12;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `0${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  return phone.trim();
}

async function getOrCreateLedger(phone: string, shopId: string, name?: string) {
  const admin = createAdminClient();
  const normalized = normalizePhone(phone);

  const { data: existing } = await admin
    .from('customer_ledger')
    .select('*')
    .eq('phone', normalized)
    .eq('shop_id', shopId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await admin
    .from('customer_ledger')
    .insert({ phone: normalized, shop_id: shopId, name: name ?? null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** 포인트 적립 */
export async function earnPoints(params: {
  phone: string;
  name?: string;
  amountWon: number;
  type: 'EARN_BOOKING' | 'EARN_DEPOSIT';
  shopId: string;
  bookingId?: string;
  description?: string;
}): Promise<{ earned: number; newBalance: number }> {
  const { phone, name, amountWon, type, shopId, bookingId, description } = params;
  const earned = Math.floor(amountWon * EARN_RATE);
  if (earned <= 0) return { earned: 0, newBalance: 0 };

  const admin = createAdminClient();
  const ledger = await getOrCreateLedger(phone, shopId, name);

  const newBalance = ledger.point_balance + earned;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + EXPIRE_MONTHS);

  await admin.from('customer_ledger').update({
    name: name ?? ledger.name,
    point_balance: newBalance,
    total_earned: ledger.total_earned + earned,
  }).eq('id', ledger.id);

  await admin.from('point_transactions').insert({
    ledger_id: ledger.id,
    phone: normalizePhone(phone),
    amount: earned,
    balance_after: newBalance,
    type,
    shop_id: shopId,
    booking_id: bookingId ?? null,
    description: description ?? `${Math.round(EARN_RATE * 100)}% 적립`,
    expires_at: expiresAt.toISOString(),
  });

  return { earned, newBalance };
}

/** 포인트 잔액 조회 (샵별) */
export async function getPointBalance(phone: string, shopId: string): Promise<{
  balance: number;
  totalEarned: number;
  totalSpent: number;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('customer_ledger')
    .select('point_balance, total_earned, total_spent')
    .eq('phone', normalizePhone(phone))
    .eq('shop_id', shopId)
    .maybeSingle();

  if (!data) return null;
  return {
    balance: data.point_balance,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
  };
}

/**
 * 예약 취소 시 포인트 복원
 * - SPEND_BEAUTICA(사용분) → 잔액에 돌려줌 (항상)
 * - EARN_DEPOSIT(적립분) → 잔액에서 회수 (잔액 부족 시 생략, B안)
 */
export async function refundBookingPoints(params: {
  phone: string;
  shopId: string;
  bookingId: string;
  pointsUsed: number;
}): Promise<void> {
  const { phone, shopId, bookingId, pointsUsed } = params;
  const admin = createAdminClient();
  const normalized = normalizePhone(phone);

  const ledger = await getOrCreateLedger(phone, shopId);

  // 1. SPEND_BEAUTICA 복원 — 예약 시 차감한 포인트 돌려주기
  if (pointsUsed > 0) {
    const newBalance = ledger.point_balance + pointsUsed;
    await admin.from('customer_ledger').update({
      point_balance: newBalance,
      total_spent: Math.max(0, ledger.total_spent - pointsUsed),
    }).eq('id', ledger.id);

    await admin.from('point_transactions').insert({
      ledger_id: ledger.id,
      phone: normalized,
      amount: pointsUsed,
      balance_after: newBalance,
      type: 'REFUND_CANCEL',
      shop_id: shopId,
      booking_id: bookingId,
      description: '예약 취소 — 사용 포인트 반환',
    });

    // ledger 갱신 (다음 EARN_DEPOSIT 회수 시 최신 잔액 필요)
    ledger.point_balance = newBalance;
    ledger.total_spent = Math.max(0, ledger.total_spent - pointsUsed);
  }

  // 2. EARN_DEPOSIT 회수 — 예약금 결제 시 적립된 포인트 돌려받기
  const { data: earnTx } = await admin
    .from('point_transactions')
    .select('amount')
    .eq('booking_id', bookingId)
    .eq('type', 'EARN_DEPOSIT')
    .maybeSingle();

  const earned = earnTx?.amount ?? 0;
  if (earned > 0 && ledger.point_balance >= earned) {
    const newBalance = ledger.point_balance - earned;
    await admin.from('customer_ledger').update({
      point_balance: newBalance,
      total_earned: Math.max(0, ledger.total_earned - earned),
    }).eq('id', ledger.id);

    await admin.from('point_transactions').insert({
      ledger_id: ledger.id,
      phone: normalized,
      amount: -earned,
      balance_after: newBalance,
      type: 'REFUND_CANCEL',
      shop_id: shopId,
      booking_id: bookingId,
      description: '예약 취소 — 적립 포인트 회수',
    });
  }
  // 잔액 부족하면 회수 생략 (B안)
}

/** 포인트 차감 (예약 시 사용) */
export async function spendPoints(params: {
  phone: string;
  shopId: string;
  amount: number;
  type: 'SPEND_BEAUTICA';
  bookingId?: string;
  description?: string;
}): Promise<{ spent: number; newBalance: number }> {
  const { phone, shopId, amount, type, bookingId, description } = params;
  const admin = createAdminClient();
  const ledger = await getOrCreateLedger(phone, shopId);

  if (ledger.point_balance < amount) {
    throw new Error('포인트 잔액이 부족합니다');
  }

  const newBalance = ledger.point_balance - amount;

  await admin.from('customer_ledger').update({
    point_balance: newBalance,
    total_spent: ledger.total_spent + amount,
  }).eq('id', ledger.id);

  await admin.from('point_transactions').insert({
    ledger_id: ledger.id,
    phone: normalizePhone(phone),
    amount: -amount,
    balance_after: newBalance,
    type,
    shop_id: shopId,
    booking_id: bookingId ?? null,
    description: description ?? '포인트 사용',
  });

  return { spent: amount, newBalance };
}
