"use client";

import { useState, useTransition } from "react";
import { lookupBookings, customerCancelBooking, type CustomerBooking } from "./actions";

type Step = "phone" | "list" | "confirm" | "done";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "신청 대기",
  CONFIRMED: "확정",
  COMPLETED: "완료",
  CANCELLED: "취소됨",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-400",
};

export function MyBookingsClient({ slug }: { slug: string }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [shopName, setShopName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    refunded: boolean;
    refundAmount: number;
    noRefundReason?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLookup = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("전화번호를 올바르게 입력해주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await lookupBookings(slug, phone);
      if (res.error) {
        setError(res.error);
        return;
      }
      setBookings(res.bookings ?? []);
      setShopName(res.shopName ?? "");
      setStep("list");
    });
  };

  const handleCancelConfirm = () => {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const res = await customerCancelBooking({ bookingId: selectedId, phone, shopSlug: slug });
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult({
        refunded: res.refunded ?? false,
        refundAmount: res.refundAmount ?? 0,
        noRefundReason: res.noRefundReason,
      });
      setStep("done");
    });
  };

  const selectedBooking = bookings.find((b) => b.id === selectedId);
  const cancellable = (b: CustomerBooking) => b.status === "PENDING" || b.status === "CONFIRMED";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          {shopName && <p className="mb-1 text-sm text-gray-500">{shopName}</p>}
          <h1 className="text-2xl font-bold text-gray-900">내 예약 조회</h1>
        </div>

        {/* STEP: 전화번호 입력 */}
        {step === "phone" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              예약 시 사용한 전화번호
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="010-0000-0000"
              maxLength={13}
              className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:border-rose-400 focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={isPending}
              onClick={handleLookup}
              className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--rose-gold-500, #c87a8a)" }}
            >
              {isPending ? "조회 중..." : "예약 조회"}
            </button>
          </div>
        )}

        {/* STEP: 예약 목록 */}
        {step === "list" && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-gray-500">해당 번호로 예약된 내역이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setError(null); }}
                  className="mt-4 text-sm text-rose-500 underline"
                >
                  다시 조회
                </button>
              </div>
            ) : (
              bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}
                      >
                        {STATUS_LABEL[b.status]}
                      </span>
                      <p className="mt-1 font-semibold text-gray-900">{b.service_name}</p>
                      <p className="text-sm text-gray-500">{formatDate(b.start_at)}</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm text-gray-700">
                      {b.price_won.toLocaleString()}원
                    </p>
                  </div>

                  {b.deposit_paid && (
                    <p className="mb-3 text-xs text-gray-500">
                      예약금 {b.deposit_amount_won.toLocaleString()}원 결제 완료
                      {b.points_used > 0 && ` (포인트 ${b.points_used.toLocaleString()}P 사용)`}
                    </p>
                  )}

                  {cancellable(b) && (
                    <button
                      type="button"
                      onClick={() => { setSelectedId(b.id); setStep("confirm"); setError(null); }}
                      className="w-full rounded-xl border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      예약 취소
                    </button>
                  )}
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => { setStep("phone"); setError(null); }}
              className="w-full text-center text-sm text-gray-400 underline"
            >
              ← 다시 조회
            </button>
          </div>
        )}

        {/* STEP: 취소 확인 */}
        {step === "confirm" && selectedBooking && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">예약 취소 확인</h2>

            <div className="mb-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-medium">{selectedBooking.service_name}</p>
              <p className="mt-1 text-gray-500">{formatDate(selectedBooking.start_at)}</p>
              {selectedBooking.deposit_paid && selectedBooking.deposit_amount_won > 0 && (
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <p className="text-xs text-gray-500">
                    예약금 {selectedBooking.deposit_amount_won.toLocaleString()}원
                    {selectedBooking.payment_key
                      ? " — 취소 가능 시간 내 취소 시 카드 환불"
                      : ""}
                  </p>
                </div>
              )}
            </div>

            <p className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              ⚠️ 취소 후에는 되돌릴 수 없습니다. 정말 취소하시겠습니까?
            </p>

            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleCancelConfirm}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? "처리 중..." : "취소 확정"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("list"); setSelectedId(null); setError(null); }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                돌아가기
              </button>
            </div>
          </div>
        )}

        {/* STEP: 완료 */}
        {step === "done" && result && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-4 text-4xl">✅</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">예약이 취소되었습니다</h2>

            {result.refunded ? (
              <p className="text-sm text-gray-600">
                예약금{" "}
                <span className="font-semibold text-blue-600">
                  {result.refundAmount.toLocaleString()}원
                </span>
                이 카드로 환불 처리됩니다.
                <br />
                <span className="text-xs text-gray-400">(영업일 기준 3~5일 소요)</span>
              </p>
            ) : result.noRefundReason ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                {result.noRefundReason}
              </p>
            ) : (
              <p className="text-sm text-gray-500">예약금 결제 내역이 없습니다.</p>
            )}

            <button
              type="button"
              onClick={() => { setStep("list"); setSelectedId(null); setResult(null); }}
              className="mt-6 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              목록으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
