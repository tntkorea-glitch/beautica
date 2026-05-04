"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribePlan, cancelSubscription, PLAN_FEES, PLAN_LABELS } from "./actions";

const BANK_OPTIONS = [
  { code: "004", name: "KB국민은행" },
  { code: "011", name: "NH농협은행" },
  { code: "020", name: "우리은행" },
  { code: "088", name: "신한은행" },
  { code: "081", name: "하나은행" },
  { code: "003", name: "IBK기업은행" },
  { code: "023", name: "SC제일은행" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "토스뱅크" },
  { code: "089", name: "케이뱅크" },
  { code: "032", name: "부산은행" },
  { code: "034", name: "광주은행" },
  { code: "031", name: "대구은행" },
  { code: "039", name: "경남은행" },
  { code: "007", name: "수협은행" },
  { code: "027", name: "씨티은행" },
  { code: "002", name: "산업은행" },
];

const PLANS = [
  {
    id: "FREE",
    label: "무료",
    price: 0,
    desc: "소규모 샵 기본 운영",
    features: ["예약 관리", "고객 관리", "스태프 최대 2명"],
  },
  {
    id: "BASIC",
    label: "베이직",
    price: 30000,
    desc: "성장 중인 샵",
    features: ["무료 모든 기능", "알림톡 발송", "통계 대시보드", "스태프 최대 10명"],
  },
  {
    id: "PRO",
    label: "프로",
    price: 60000,
    desc: "전문 뷰티샵",
    features: ["베이직 모든 기능", "포인트 로열티", "자동 청구 관리", "스태프 무제한"],
  },
] as const;

type PlanId = "FREE" | "BASIC" | "PRO";
type PaymentKind = "CMS" | "CARD";

type Props = {
  currentPlan: PlanId;
  currentStatus: string | null;
  hasHmsMember: boolean;
};

export default function SubscriptionForm({ currentPlan, currentStatus, hasHmsMember }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(currentPlan);
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("CMS");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerNumber, setPayerNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [billingDay, setBillingDay] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const isPaidPlan = selectedPlan !== "FREE";
  const isCurrentPlan = selectedPlan === currentPlan && currentStatus === "ACTIVE";
  const needsPaymentInfo = isPaidPlan && !hasHmsMember;

  async function doSubscribe() {
    setError(null);
    startTransition(async () => {
      const result = await subscribePlan({
        plan: selectedPlan,
        paymentKind,
        paymentNumber: paymentNumber.replace(/\s/g, ""),
        payerName,
        payerNumber,
        paymentCompany: paymentKind === "CMS" ? bankCode : undefined,
        billingDay,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    doSubscribe();
  }

  async function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscription();
      if (result.error) {
        setError(result.error);
      } else {
        setShowCancel(false);
        router.refresh();
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-2xl mb-2">✓</div>
        <p className="font-semibold text-green-800">
          {PLAN_LABELS[selectedPlan]} 플랜으로 {selectedPlan === "FREE" ? "변경" : "등록"}되었습니다.
        </p>
        {selectedPlan !== "FREE" && (
          <p className="mt-1 text-sm text-green-700">
            매월 {billingDay}일에 {PLAN_FEES[selectedPlan].toLocaleString()}원이 자동 청구됩니다.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 플랜 선택 */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-700">요금제 선택</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrent = plan.id === currentPlan && currentStatus === "ACTIVE";
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? "border-rose-500 bg-rose-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {isCurrent && (
                  <span className="absolute right-2 top-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    현재
                  </span>
                )}
                <div className="mb-1 font-bold text-gray-900">{plan.label}</div>
                <div className="mb-3 text-xs text-gray-500">{plan.desc}</div>
                <div className="mb-3 font-semibold text-rose-600">
                  {plan.price === 0 ? "무료" : `${plan.price.toLocaleString()}원/월`}
                </div>
                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1 text-xs text-gray-600">
                      <span className="mt-0.5 text-emerald-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* 결제 정보 (유료 플랜 + HMS 미등록 시) */}
      {isPaidPlan && needsPaymentInfo && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-5">
          <p className="text-sm font-semibold text-gray-800">결제 수단 등록</p>

          {/* 결제 방식 */}
          <div className="flex gap-3">
            {(["CMS", "CARD"] as const).map((kind) => (
              <label key={kind} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentKind"
                  value={kind}
                  checked={paymentKind === kind}
                  onChange={() => setPaymentKind(kind)}
                  className="accent-rose-500"
                />
                {kind === "CMS" ? "계좌이체 (CMS)" : "카드"}
              </label>
            ))}
          </div>

          {paymentKind === "CMS" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">은행 선택</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <option value="">— 은행 선택 —</option>
                  {BANK_OPTIONS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">계좌번호 (숫자만)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="01012345678901"
                  maxLength={20}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">카드번호 (16자리)</label>
              <input
                type="text"
                inputMode="numeric"
                value={paymentNumber}
                onChange={(e) => setPaymentNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder="1234567890123456"
                maxLength={16}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {paymentKind === "CMS" ? "예금주명" : "카드 소지자명"}
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="홍길동"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">생년월일 6자리</label>
              <input
                type="text"
                inputMode="numeric"
                value={payerNumber}
                onChange={(e) => setPayerNumber(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="900101"
                maxLength={6}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">월 청구일</label>
            <select
              value={billingDay}
              onChange={(e) => setBillingDay(parseInt(e.target.value, 10))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                <option key={d} value={d}>매월 {d}일</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {isPending ? "처리 중…" : `${PLAN_LABELS[selectedPlan]} 플랜 등록`}
          </button>
        </form>
      )}

      {/* 유료 플랜 + 이미 HMS 등록된 경우 → 플랜만 변경 */}
      {isPaidPlan && !needsPaymentInfo && !isCurrentPlan && (
        <div className="rounded-xl border bg-white p-5">
          <p className="mb-3 text-sm text-gray-700">
            기존 결제 수단으로 <strong>{PLAN_LABELS[selectedPlan]}</strong> 플랜으로 변경합니다.
          </p>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={doSubscribe}
            disabled={isPending}
            className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {isPending ? "처리 중…" : `플랜 변경`}
          </button>
        </div>
      )}

      {/* 무료로 다운그레이드 */}
      {selectedPlan === "FREE" && currentPlan !== "FREE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="mb-3 text-sm font-medium text-amber-800">
            무료 플랜으로 변경하면 현재 결제 수단 등록이 해제됩니다.
          </p>
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <button
            onClick={doSubscribe}
            disabled={isPending}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {isPending ? "처리 중…" : "무료 플랜으로 변경"}
          </button>
        </div>
      )}

      {/* 구독 해지 */}
      {(currentPlan === "BASIC" || currentPlan === "PRO") && currentStatus === "ACTIVE" && (
        <div className="border-t pt-4">
          {!showCancel ? (
            <button
              onClick={() => setShowCancel(true)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              구독 해지
            </button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="mb-3 text-sm text-red-700">
                구독을 해지하면 이번 달 말까지 서비스를 이용할 수 있으며, 자동 청구가 중단됩니다.
              </p>
              {error && (
                <p className="mb-2 text-xs text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {isPending ? "처리 중…" : "해지 확인"}
                </button>
                <button
                  onClick={() => setShowCancel(false)}
                  className="rounded-lg border px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
