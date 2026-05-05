import Link from 'next/link';
import type { Plan } from '@/lib/plan';
import { PLAN_LABEL } from '@/lib/plan';

export function PlanGate({
  requiredPlan,
  featureName,
  currentPlan,
  description,
}: {
  requiredPlan: 'BASIC' | 'PRO';
  featureName: string;
  currentPlan: Plan;
  description?: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
      <div className="mb-3 text-4xl">🔒</div>
      <h3 className="text-base font-semibold text-gray-800">{featureName}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <p className="mt-3 text-sm text-gray-600">
        <span className="font-semibold" style={{ color: 'var(--rose-gold-600, #b5687a)' }}>
          {PLAN_LABEL[requiredPlan]}
        </span>{' '}
        이상에서 사용할 수 있습니다.
      </p>
      <p className="mt-1 text-xs text-gray-400">현재 플랜: {PLAN_LABEL[currentPlan]}</p>
      <Link
        href="/dashboard/subscription"
        className="mt-5 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        style={{ background: 'var(--rose-gold-500, #c87a8a)' }}
      >
        플랜 업그레이드 →
      </Link>
    </div>
  );
}
