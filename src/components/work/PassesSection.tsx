"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  consumePass,
  deactivatePass,
  issuePass,
} from "@/app/dashboard/bookings/[id]/pass-actions";

type ServiceLite = { id: string; name: string };

type Pass = {
  id: string;
  pass_type: "COUNT" | "PREPAID" | "MEMBERSHIP";
  service: { name: string } | null;
  total_count: number | null;
  remaining_count: number | null;
  prepaid_amount: number | null;
  remaining_amount: number | null;
  expires_at: string | null;
  notes: string | null;
  is_active: boolean;
  purchased_at: string;
};

export function PassesSection({
  customerId,
  bookingId,
  services,
  passes,
}: {
  customerId: string;
  bookingId?: string;
  services: ServiceLite[];
  passes: Pass[];
}) {
  const router = useRouter();
  const [showIssue, setShowIssue] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 신규 발급 폼 state
  const [passType, setPassType] = useState<"COUNT" | "PREPAID">("COUNT");
  const [serviceId, setServiceId] = useState("");
  const [totalCount, setTotalCount] = useState(10);
  const [prepaidAmountDisplay, setPrepaidAmountDisplay] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");

  const resetIssueForm = () => {
    setPassType("COUNT");
    setServiceId("");
    setTotalCount(10);
    setPrepaidAmountDisplay("");
    setExpiresAt("");
    setNotes("");
    setError(null);
    setShowIssue(false);
  };

  const handleIssue = () => {
    setError(null);
    const prepaidAmount = passType === "PREPAID"
      ? Number(prepaidAmountDisplay.replace(/\D/g, "")) || 0
      : null;
    startTransition(async () => {
      const r = await issuePass({
        customerId,
        passType,
        serviceId: serviceId || null,
        totalCount: passType === "COUNT" ? totalCount : null,
        prepaidAmount,
        expiresAt: expiresAt || null,
        notes,
        bookingIdForRevalidate: bookingId,
      });
      if (r?.error) setError(r.error);
      else {
        resetIssueForm();
        router.refresh();
      }
    });
  };

  const handleConsumeOne = (p: Pass) => {
    setError(null);
    startTransition(async () => {
      const r = await consumePass({
        passId: p.id,
        customerId,
        count: 1,
        bookingIdForRevalidate: bookingId,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  const handleConsumeAmount = (p: Pass) => {
    const input = prompt("차감할 금액 (원):");
    if (!input) return;
    const amount = Number(input.replace(/\D/g, ""));
    if (!amount) return;
    setError(null);
    startTransition(async () => {
      const r = await consumePass({
        passId: p.id,
        customerId,
        amount,
        bookingIdForRevalidate: bookingId,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  const handleDeactivate = (p: Pass) => {
    if (!confirm("이 회수권을 비활성화 하시겠어요? (잔여분 차감 불가)")) return;
    setError(null);
    startTransition(async () => {
      const r = await deactivatePass(p.id, customerId);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  const activePasses = passes.filter((p) => p.is_active);
  const expiredPasses = passes.filter((p) => !p.is_active);

  return (
    <section className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">🎟 회수권 / 선불권</h3>
        {!showIssue && (
          <button
            type="button"
            onClick={() => setShowIssue(true)}
            className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-gold-700"
          >
            + 신규 발급
          </button>
        )}
      </div>

      {/* 활성 회수권 */}
      {activePasses.length > 0 ? (
        <div className="space-y-2">
          {activePasses.map((p) => (
            <PassCard
              key={p.id}
              pass={p}
              onConsumeOne={() => handleConsumeOne(p)}
              onConsumeAmount={() => handleConsumeAmount(p)}
              onDeactivate={() => handleDeactivate(p)}
              disabled={isPending}
            />
          ))}
        </div>
      ) : (
        !showIssue && (
          <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
            보유 회수권 없음.
          </p>
        )
      )}

      {/* 만료/소진 회수권 */}
      {expiredPasses.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-800">
            만료/소진된 회수권 {expiredPasses.length}건 보기
          </summary>
          <div className="mt-2 space-y-1.5">
            {expiredPasses.map((p) => (
              <div
                key={p.id}
                className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500"
              >
                {p.service?.name ?? "전체 사용"} ·{" "}
                {p.pass_type === "COUNT"
                  ? `${p.total_count}회 (소진)`
                  : `${p.prepaid_amount?.toLocaleString()}원 (잔액 ${p.remaining_amount?.toLocaleString()}원)`}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 신규 발급 폼 */}
      {showIssue && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">종류</div>
            <div className="flex gap-1.5">
              <TypeButton
                active={passType === "COUNT"}
                onClick={() => setPassType("COUNT")}
                label="회수권 (N회권)"
                emoji="🎫"
              />
              <TypeButton
                active={passType === "PREPAID"}
                onClick={() => setPassType("PREPAID")}
                label="선불권 (충전식)"
                emoji="💳"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              적용 시술 (선택, 비우면 전체 사용)
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            >
              <option value="">전체 사용 가능</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {passType === "COUNT" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">총 횟수</label>
              <input
                type="number"
                min={1}
                value={totalCount}
                onChange={(e) => setTotalCount(Number(e.target.value) || 1)}
                className="block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">충전 금액 (원)</label>
              <input
                inputMode="numeric"
                value={prepaidAmountDisplay}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  setPrepaidAmountDisplay(d ? Number(d).toLocaleString() : "");
                }}
                placeholder="500,000"
                className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">만료일 (선택)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="block w-44 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">메모 (선택)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="결제 방법, 할인 적용 여부 등"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleIssue}
              className="rounded-md bg-rose-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
            >
              {isPending ? "발급 중..." : "발급"}
            </button>
            <button
              type="button"
              onClick={resetIssueForm}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && !showIssue && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </section>
  );
}

function PassCard({
  pass: p,
  onConsumeOne,
  onConsumeAmount,
  onDeactivate,
  disabled,
}: {
  pass: Pass;
  onConsumeOne: () => void;
  onConsumeAmount: () => void;
  onDeactivate: () => void;
  disabled: boolean;
}) {
  const isCount = p.pass_type === "COUNT";
  const expired = p.expires_at && new Date(p.expires_at).getTime() < Date.now();

  return (
    <div className="rounded-lg border border-rose-gold-100 bg-rose-gold-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-rose-gold-800">
              {isCount ? "🎫 회수권" : "💳 선불권"}
            </span>
            <span className="text-sm text-gray-700">
              {p.service?.name ?? "전체 사용"}
            </span>
          </div>
          <div className="mt-1 text-sm font-mono text-gray-900">
            {isCount ? (
              <>
                남은 <strong className="text-rose-gold-700">{p.remaining_count}</strong>{" "}
                / 총 {p.total_count}회
              </>
            ) : (
              <>
                잔액 <strong className="text-rose-gold-700">{p.remaining_amount?.toLocaleString()}</strong>원{" "}
                / 충전 {p.prepaid_amount?.toLocaleString()}원
              </>
            )}
          </div>
          {p.expires_at && (
            <div className={`mt-0.5 text-xs ${expired ? "text-red-600" : "text-gray-500"}`}>
              {expired ? "⚠️ 만료됨" : "만료일"}: {new Date(p.expires_at).toLocaleDateString("ko-KR")}
            </div>
          )}
          {p.notes && <div className="mt-1 text-xs text-gray-600">📝 {p.notes}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCount ? (
            <button
              type="button"
              disabled={disabled || expired === true}
              onClick={onConsumeOne}
              className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
            >
              -1회 차감
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || expired === true}
              onClick={onConsumeAmount}
              className="rounded-md bg-rose-gold-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-gold-700 disabled:opacity-50"
            >
              금액 차감
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onDeactivate}
            className="text-xs text-gray-400 hover:text-red-600"
          >
            비활성화
          </button>
        </div>
      </div>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  label,
  emoji,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex flex-1 items-center justify-center gap-1 rounded-md bg-rose-gold-600 px-3 py-2 text-sm font-medium text-white"
          : "flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      }
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}
