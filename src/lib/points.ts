/**
 * beautica 포인트/로열티 시스템
 * 전화번호 기반 cross-shop 포인트 (customer_ledger + point_transactions)
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

async function getOrCreateLedger(phone: string, name?: string) {
  const admin = createAdminClient();
  const normalized = normalizePhone(phone);

  const { data: existing } = await admin
    .from('customer_ledger')
    .select('*')
    .eq('phone', normalized)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await admin
    .from('customer_ledger')
    .insert({ phone: normalized, name: name ?? null })
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
  const ledger = await getOrCreateLedger(phone, name);

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

/** 포인트 잔액 조회 */
export async function getPointBalance(phone: string): Promise<{
  balance: number;
  totalEarned: number;
  totalSpent: number;
} | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('customer_ledger')
    .select('point_balance, total_earned, total_spent')
    .eq('phone', normalizePhone(phone))
    .maybeSingle();

  if (!data) return null;
  return {
    balance: data.point_balance,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
  };
}

/** 포인트 차감 (tnt-mall 주문 시) */
export async function spendPoints(params: {
  phone: string;
  amount: number;
  type: 'SPEND_TNTMALL' | 'SPEND_BEAUTICA';
  description?: string;
}): Promise<{ spent: number; newBalance: number }> {
  const { phone, amount, type, description } = params;
  const admin = createAdminClient();
  const ledger = await getOrCreateLedger(phone);

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
    description: description ?? '포인트 사용',
  });

  return { spent: amount, newBalance };
}
