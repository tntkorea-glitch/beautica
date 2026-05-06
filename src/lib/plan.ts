import { createAdminClient } from '@/lib/supabase/admin';

export type Plan = 'FREE' | 'BASIC' | 'PRO';

const PLAN_LEVEL: Record<Plan, number> = { FREE: 0, BASIC: 1, PRO: 2 };

export function canUsePlan(current: Plan, required: Plan): boolean {
  return PLAN_LEVEL[current] >= PLAN_LEVEL[required];
}

export const PLAN_LABEL: Record<Plan, string> = {
  FREE: '무료',
  BASIC: 'BASIC (30,000원/월)',
  PRO: 'PRO (60,000원/월)',
};

/** 플랜별 최대 스태프 수. PRO는 제한 없음 (Infinity) */
export const PLAN_STAFF_LIMIT: Record<Plan, number> = {
  FREE: 2,
  BASIC: 10,
  PRO: Infinity,
};

/** shop_subscriptions에서 현재 유효 플랜 조회. CANCELLED or 없으면 FREE */
export async function getShopPlan(shopId: string): Promise<Plan> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('shop_subscriptions')
    .select('plan, status')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || data.status === 'CANCELLED') return 'FREE';
  return (data.plan as Plan) ?? 'FREE';
}
