"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  noShowBooking,
} from "./actions";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type BookingSource = "BEAUTICA" | "NAVER" | "WALK_IN" | "PHONE";

type Booking = {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  source: BookingSource;
  guest_name: string | null;
  guest_phone: string | null;
  price_won: number;
  customer_note: string | null;
  shop_note: string | null;
  customer: { name: string; phone: string | null } | null;
  service: { name: string; duration_min: number } | null;
  staff: { name: string; display_color: string } | null;
};

const SOURCE_BADGE: Record<BookingSource, { label: string; className: string } | null> = {
  BEAUTICA: null,
  NAVER: { label: "네이버", className: "bg-green-100 text-green-700" },
  WALK_IN: { label: "방문", className: "bg-gray-100 text-gray-600" },
  PHONE: { label: "전화", className: "bg-purple-100 text-purple-700" },
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "신청 대기",
  CONFIRMED: "확정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  NO_SHOW: "노쇼",
};

export function BookingRow({ booking: b }: { booking: Booking }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const start = new Date(b.start_at);
  const end = new Date(b.end_at);
  const dateStr = start.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())} ~ ${pad(
    end.getHours(),
  )}:${pad(end.getMinutes())}`;

  const customerName = b.customer?.name ?? b.guest_name ?? "-";
  const customerPhone = b.customer?.phone ?? b.guest_phone ?? "-";
  const serviceName = b.service?.name ?? "(삭제된 시술)";

  const wrap = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>
              {STATUS_LABEL[b.status]}
            </span>
            {SOURCE_BADGE[b.source] && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[b.source]!.className}`}>
                {SOURCE_BADGE[b.source]!.label}
              </span>
            )}
            <span className="text-base font-semibold text-gray-900">{dateStr}</span>
            <span className="font-mono text-sm text-gray-700">{timeStr}</span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">{customerName}</span>
            {customerPhone !== "-" && (
              <span className="ml-2 font-mono text-xs text-gray-500">{customerPhone}</span>
            )}
            <span className="mx-2 text-gray-300">|</span>
            <span>{serviceName}</span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="font-mono">{b.price_won.toLocaleString()}원</span>
            {b.staff && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: b.staff.display_color }}
                />
                {b.staff.name}
              </span>
            )}
          </div>
          {b.customer_note && (
            <div className="text-xs text-gray-600">
              📝 고객: {b.customer_note}
            </div>
          )}
          {b.shop_note && (
            <div className="text-xs text-gray-600">📌 매장: {b.shop_note}</div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/dashboard/bookings/${b.id}`}
            className="text-xs text-rose-gold-700 hover:underline"
          >
            상세 / 작업 →
          </Link>
          {b.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => wrap(() => confirmBooking(b.id))}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                확정
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setCancelling(true)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          )}
          {b.status === "CONFIRMED" && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => wrap(() => completeBooking(b.id))}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                완료 처리
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => wrap(() => noShowBooking(b.id))}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                노쇼
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setCancelling(true)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
            </div>
          )}
        </div>
      </div>

      {cancelling && (
        <div className="mt-3 rounded-md border bg-gray-50 p-3">
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
                  const r = await cancelBooking(b.id, cancelReason);
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
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
