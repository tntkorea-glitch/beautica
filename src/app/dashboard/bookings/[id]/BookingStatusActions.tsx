"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmBooking,
  completeBooking,
  cancelBooking,
  noShowBooking,
  confirmBankTransfer,
} from "@/app/dashboard/bookings/actions";

type Status = "PAYMENT_PENDING" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export function BookingStatusActions({
  bookingId,
  status,
  canRefund = false,
  depositAmount = 0,
}: {
  bookingId: string;
  status: Status;
  canRefund?: boolean;
  depositAmount?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundDeposit, setRefundDeposit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<{ refunded: boolean; amount: number } | null>(null);

  const wrap = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const r = await cancelBooking(bookingId, cancelReason, canRefund && refundDeposit);
      if (r?.error) {
        setError(r.error);
      } else {
        setCancelling(false);
        setCancelReason("");
        if (r.refunded) {
          setRefundResult({ refunded: true, amount: r.refundAmount ?? 0 });
        }
        router.refresh();
      }
    });
  };

  if (status === "COMPLETED" || status === "CANCELLED") return null;

  if (status === "PAYMENT_PENDING") {
    return (
      <div className="mt-4 border-t pt-4">
        <p className="mb-2 text-xs text-amber-700 font-medium">무통장 입금 대기 중</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => wrap(() => confirmBankTransfer(bookingId))}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "처리 중..." : "입금 확인"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setCancelling(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
        </div>
        {cancelling && (
          <CancelDialog
            reason={cancelReason}
            onReasonChange={setCancelReason}
            canRefund={false}
            refundDeposit={false}
            onRefundToggle={() => {}}
            depositAmount={0}
            isPending={isPending}
            onConfirm={handleCancel}
            onClose={() => { setCancelling(false); setCancelReason(""); }}
          />
        )}
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => wrap(() => confirmBooking(bookingId))}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              예약 확정
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setCancelling(true)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              거절
            </button>
          </>
        )}
        {status === "CONFIRMED" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => wrap(() => completeBooking(bookingId))}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              완료 처리
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => wrap(() => noShowBooking(bookingId))}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              노쇼
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setCancelling(true)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
          </>
        )}
        {status === "NO_SHOW" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setCancelling(true)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            취소 처리
          </button>
        )}
      </div>

      {cancelling && (
        <CancelDialog
          reason={cancelReason}
          onReasonChange={setCancelReason}
          canRefund={canRefund}
          refundDeposit={refundDeposit}
          onRefundToggle={() => setRefundDeposit((v) => !v)}
          depositAmount={depositAmount}
          isPending={isPending}
          onConfirm={handleCancel}
          onClose={() => { setCancelling(false); setCancelReason(""); setRefundDeposit(true); }}
        />
      )}

      {refundResult && (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
          ✅ 취소 완료 — 예약금 {refundResult.amount.toLocaleString()}원 환불 처리됨
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}

function CancelDialog({
  reason,
  onReasonChange,
  canRefund,
  refundDeposit,
  onRefundToggle,
  depositAmount,
  isPending,
  onConfirm,
  onClose,
}: {
  reason: string;
  onReasonChange: (v: string) => void;
  canRefund: boolean;
  refundDeposit: boolean;
  onRefundToggle: () => void;
  depositAmount: number;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border bg-gray-50 p-3">
      <input
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="취소 사유 (선택)"
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
      {canRefund && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={refundDeposit}
            onChange={onRefundToggle}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-gray-700">
            예약금 환불
            {depositAmount > 0 && (
              <span className="ml-1 text-gray-500">({depositAmount.toLocaleString()}원)</span>
            )}
          </span>
        </label>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "처리 중..." : "취소 확정"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
