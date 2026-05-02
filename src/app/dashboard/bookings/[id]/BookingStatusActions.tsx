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
}: {
  bookingId: string;
  status: Status;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          <div className="mt-3 rounded-lg border bg-gray-50 p-3">
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유 (선택)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  wrap(async () => {
                    const r = await cancelBooking(bookingId, cancelReason);
                    if (!r.error) { setCancelling(false); setCancelReason(""); }
                    return r;
                  })
                }
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "취소 확정"}
              </button>
              <button type="button" onClick={() => { setCancelling(false); setCancelReason(""); }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                닫기
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  const wrap = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

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
        <div className="mt-3 rounded-lg border bg-gray-50 p-3">
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유 (선택)"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                wrap(async () => {
                  const r = await cancelBooking(bookingId, cancelReason);
                  if (!r.error) {
                    setCancelling(false);
                    setCancelReason("");
                  }
                  return r;
                })
              }
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "취소 확정"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelling(false);
                setCancelReason("");
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
