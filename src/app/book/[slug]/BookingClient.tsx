"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { createGuestBooking, initBookingPayment } from "./actions";
import { formatPhone } from "@/lib/format";
import { BankLinks } from "@/components/BankLinks";
import type { BankCode } from "@/components/BankLinks";

type Service = {
  id: string;
  name: string;
  category: string | null;
  price_won: number | null;
  duration_min: number | null;
  photo_url: string | null;
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  depositRequired: boolean;
  depositAmount: number;
  bankCode: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankHolder: string | null;
  pointsEnabled: boolean;
  pointsMinUse: number;
};

type Step = "service" | "datetime" | "info" | "bank_transfer" | "done";

function timeSlots() {
  const slots: string[] = [];
  for (let h = 9; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 20) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

function formatPrice(won: number | null) {
  if (!won) return "가격 문의";
  return won.toLocaleString("ko-KR") + "원";
}

function formatDuration(min: number | null) {
  if (!min) return "";
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function BookingClient({ shop, services }: { shop: Shop; services: Service[] }) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [depositDeadline, setDepositDeadline] = useState("");
  const [bankTransferAmount, setBankTransferAmount] = useState(0);

  // 포인트
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsInputError, setPointsInputError] = useState("");

  const showPoints = shop.pointsEnabled && shop.depositRequired && shop.depositAmount > 0;
  const effectiveDeposit = Math.max(0, shop.depositAmount - pointsToUse);

  // 전화번호 11자리 완성 시 포인트 잔액 자동 조회
  useEffect(() => {
    if (!showPoints) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 11) {
      setPointsBalance(null);
      setPointsToUse(0);
      setPointsInputError("");
      return;
    }
    setPointsLoading(true);
    fetch(`/api/points/balance?phone=${encodeURIComponent(phone)}&shopSlug=${shop.slug}`)
      .then((r) => r.json())
      .then((data: { balance: number }) => setPointsBalance(data.balance ?? 0))
      .catch(() => setPointsBalance(0))
      .finally(() => setPointsLoading(false));
  }, [phone, showPoints, shop.slug]);

  function handlePointsToUseChange(val: number) {
    setPointsInputError("");
    const balance = pointsBalance ?? 0;
    const capped = Math.min(val, balance, shop.depositAmount);
    setPointsToUse(capped < 0 ? 0 : capped);
    if (capped > 0 && capped < shop.pointsMinUse) {
      setPointsInputError(`최소 ${shop.pointsMinUse.toLocaleString()}원 이상 사용해야 합니다`);
    }
  }

  function isPointsValid() {
    if (pointsToUse === 0) return true;
    return pointsToUse >= shop.pointsMinUse;
  }

  const slots = timeSlots();

  // 예약금 없는 일반 예약
  async function submitDirect() {
    if (!selectedService || !date || !time || !name || !phone) return;
    setLoading(true);
    setError("");

    const startAt = new Date(`${date}T${time}:00+09:00`).toISOString();
    const result = await createGuestBooking({
      shopSlug: shop.slug,
      serviceId: selectedService.id,
      startAt,
      guestName: name,
      guestPhone: phone,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setBookingId(result.bookingId ?? "");
      setStep("done");
    }
  }

  // 예약금 카드 결제 — 예약 생성 후 토스 결제창 열기
  async function submitWithCard() {
    if (!selectedService || !date || !time || !name || !phone) return;
    if (!isPointsValid()) return;
    setLoading(true);
    setError("");

    const startAt = new Date(`${date}T${time}:00+09:00`).toISOString();
    const result = await initBookingPayment({
      shopSlug: shop.slug,
      serviceId: selectedService.id,
      startAt,
      guestName: name,
      guestPhone: phone,
      depositAmount: shop.depositAmount,
      pointsUsed: pointsToUse,
    });

    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    // 포인트로 전액 결제 시 결제창 생략
    if (result.skipPayment) {
      setLoading(false);
      setBookingId(result.bookingId ?? "");
      setStep("done");
      return;
    }

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: crypto.randomUUID() });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: effectiveDeposit },
        orderId: result.orderId!,
        orderName: `${selectedService.name} 예약금`,
        successUrl: `${location.origin}/book/${shop.slug}/payment-result`,
        failUrl: `${location.origin}/book/${shop.slug}/payment-result`,
        customerName: name,
        customerMobilePhone: phone.replace(/\D/g, ""),
      });
    } catch (e: unknown) {
      setLoading(false);
      console.error("[Toss 결제 에러]", e);
      const tErr = e as { message?: string; code?: string };
      const msg = tErr?.message ?? "결제 창을 열 수 없습니다.";
      const code = tErr?.code ? ` (${tErr.code})` : "";
      setError(msg + code);
    }
  }

  // 예약금 무통장입금 — 예약 생성 후 계좌 안내 step으로 이동
  async function submitWithDeposit() {
    if (!selectedService || !date || !time || !name || !phone) return;
    if (!isPointsValid()) return;
    setLoading(true);
    setError("");

    const startAt = new Date(`${date}T${time}:00+09:00`).toISOString();
    const result = await initBookingPayment({
      shopSlug: shop.slug,
      serviceId: selectedService.id,
      startAt,
      guestName: name,
      guestPhone: phone,
      depositAmount: shop.depositAmount,
      pointsUsed: pointsToUse,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    // 포인트로 전액 결제 시 입금 안내 생략
    if (result.skipPayment) {
      setBookingId(result.bookingId ?? "");
      setStep("done");
      return;
    }

    const deadline = new Date(Date.now() + 30 * 60 * 1000);
    const hh = String(deadline.getHours()).padStart(2, "0");
    const mm = String(deadline.getMinutes()).padStart(2, "0");
    setDepositDeadline(`${hh}:${mm}`);
    setBankTransferAmount(effectiveDeposit);
    setBookingId(result.bookingId ?? "");
    setStep("bank_transfer");
  }

  if (step === "bank_transfer") {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1" style={{ borderColor: "var(--rose-gold-100)" }}>
        <div className="mb-4 text-5xl text-center">🏦</div>
        <h2 className="mb-1 text-center text-xl font-bold" style={{ color: "var(--rose-gold-800)" }}>
          예약금 무통장 입금 안내
        </h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          아래 금액을 입금하신 후 원장님께 알려주세요.
        </p>

        <div className="rounded-xl p-4 text-sm space-y-2.5 mb-4" style={{ background: "var(--cream-100)" }}>
          <Row label="입금 금액" value={`${bankTransferAmount.toLocaleString("ko-KR")}원`} />
          {pointsToUse > 0 && (
            <Row label="포인트 할인" value={`-${pointsToUse.toLocaleString("ko-KR")}원`} />
          )}
          <Row label="입금 기한" value={`오늘 ${depositDeadline}까지`} />
          {shop.bankName && <Row label="은행" value={shop.bankName} />}
          {shop.bankAccountNo && <Row label="계좌번호" value={shop.bankAccountNo} />}
          {shop.bankHolder && <Row label="예금주" value={shop.bankHolder} />}
          <Row label="예약 번호" value={bookingId.slice(0, 8).toUpperCase()} />
          <Row label="시술" value={selectedService?.name ?? ""} />
          <Row label="일시" value={`${date} ${time}`} />
        </div>

        {shop.bankCode && (
          <BankLinks bankCode={shop.bankCode as BankCode} />
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mt-4 mb-4">
          입금 확인 후 원장님이 예약을 확정해 드립니다.<br />
          문의: <strong>{shop.name}</strong>
        </div>

        {bankTransferAmount > 0 && (
          <p className="text-center text-xs text-gray-400">
            ✓ 입금 확정 시 {Math.floor(bankTransferAmount * 0.01)}포인트 자동 적립
          </p>
        )}
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1" style={{ borderColor: "var(--rose-gold-100)" }}>
        <div className="mb-4 text-5xl">🌸</div>
        <h2 className="mb-2 text-xl font-bold" style={{ color: "var(--rose-gold-800)" }}>
          예약 신청 완료!
        </h2>
        <p className="mb-6 text-sm text-gray-500 leading-relaxed">
          <strong>{shop.name}</strong>에 예약 신청이 접수되었습니다.<br />
          원장님 확인 후 연락드릴 예정입니다.
        </p>
        <div className="rounded-xl p-4 text-left text-sm space-y-2 mb-6" style={{ background: "var(--cream-100)" }}>
          <Row label="시술" value={selectedService?.name ?? ""} />
          <Row label="일시" value={`${date} ${time}`} />
          <Row label="이름" value={name} />
          <Row label="연락처" value={phone} />
          {pointsToUse > 0 && (
            <Row label="포인트 사용" value={`-${pointsToUse.toLocaleString("ko-KR")}원`} />
          )}
        </div>
        <p className="text-xs text-gray-400">문의: {shop.name}</p>
      </div>
    );
  }

  const STEPS = ["service", "datetime", "info"] as const;

  return (
    <div className="space-y-4">
      {/* 진행 단계 표시 */}
      <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: step === s || i < STEPS.indexOf(step as typeof STEPS[number])
                    ? "var(--rose-gold-500)" : "var(--rose-gold-100)",
                  color: step === s || i < STEPS.indexOf(step as typeof STEPS[number]) ? "white" : "var(--rose-gold-400)",
                }}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          ))}
          <span className="ml-1 text-xs text-gray-400">
            {step === "service" ? "시술 선택" : step === "datetime" ? "날짜·시간" : "예약자 정보"}
          </span>
        </div>

      {/* Step 1: 시술 선택 */}
      {step === "service" && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-800">시술을 선택해주세요</h2>
          {services.length === 0 && (
            <p className="text-sm text-gray-400">등록된 시술 메뉴가 없습니다.</p>
          )}
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedService(s); setStep("datetime"); }}
              className="w-full rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition hover:shadow-md"
              style={{ borderColor: "var(--rose-gold-100)" }}
            >
              <div className="flex items-center gap-3">
                {s.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.photo_url}
                    alt={s.name}
                    className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    {s.category && <p className="text-xs text-gray-400 mt-0.5">{s.category}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: "var(--rose-gold-600)" }}>
                      {formatPrice(s.price_won)}
                    </p>
                    {s.duration_min && (
                      <p className="text-xs text-gray-400">{formatDuration(s.duration_min)}</p>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: 날짜·시간 */}
      {step === "datetime" && (
        <div className="space-y-4">
          <button onClick={() => setStep("service")} className="text-xs text-gray-400 hover:text-gray-600">
            ← 시술 다시 선택
          </button>
          <h2 className="text-lg font-bold text-gray-800">날짜와 시간을 선택해주세요</h2>

          {selectedService && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--rose-gold-50)" }}>
              <span className="font-medium" style={{ color: "var(--rose-gold-700)" }}>{selectedService.name}</span>
              {selectedService.duration_min && (
                <span className="text-gray-400 ml-2">· {formatDuration(selectedService.duration_min)}</span>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">날짜</label>
            <input
              type="date"
              value={date}
              min={today()}
              onChange={(e) => { setDate(e.target.value); setTime(""); }}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">시간</label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((t) => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className="rounded-lg border py-2 text-sm font-medium transition"
                  style={{
                    borderColor: time === t ? "var(--rose-gold-500)" : "var(--rose-gold-100)",
                    background: time === t ? "var(--rose-gold-500)" : "white",
                    color: time === t ? "white" : "var(--rose-gold-700)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!time}
            onClick={() => setStep("info")}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ background: "var(--rose-gold-500)" }}
          >
            다음
          </button>
        </div>
      )}

      {/* Step 3: 예약자 정보 */}
      {step === "info" && (
        <div className="space-y-4">
          <button onClick={() => setStep("datetime")} className="text-xs text-gray-400 hover:text-gray-600">
            ← 날짜 다시 선택
          </button>
          <h2 className="text-lg font-bold text-gray-800">예약자 정보를 입력해주세요</h2>

          <div className="rounded-xl p-4 text-sm space-y-1.5" style={{ background: "var(--rose-gold-50)" }}>
            <Row label="시술" value={selectedService?.name ?? ""} />
            <Row label="일시" value={`${date} ${time}`} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 홍길동"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          {/* 예약금 필요 시 → 결제 수단 선택 */}
          {shop.depositRequired && shop.depositAmount > 0 ? (
            <div className="space-y-3">
              <div className="rounded-xl p-4 text-sm space-y-2" style={{ background: "var(--cream-100)", border: "1px solid var(--rose-gold-100)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">예약금 (노쇼 방지)</span>
                  <span className="font-bold" style={{ color: "var(--rose-gold-600)" }}>
                    {shop.depositAmount.toLocaleString("ko-KR")}원
                  </span>
                </div>
                {pointsToUse > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-600">포인트 할인</span>
                    <span className="font-semibold text-emerald-600">-{pointsToUse.toLocaleString("ko-KR")}원</span>
                  </div>
                )}
                {pointsToUse > 0 && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-sm font-semibold text-gray-700">실 결제금액</span>
                    <span className="text-sm font-bold" style={{ color: "var(--rose-gold-600)" }}>
                      {effectiveDeposit.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  예약 확정을 위해 예약금 선결제가 필요합니다. 시술 후 차감됩니다.
                </p>
                {effectiveDeposit > 0 && (
                  <p className="text-xs" style={{ color: "var(--rose-gold-500)" }}>
                    ✓ 결제 완료 시 {Math.floor(effectiveDeposit * 0.01)}포인트 즉시 적립
                  </p>
                )}
              </div>

              {/* 포인트 사용 섹션 */}
              {showPoints && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-800">보유 포인트</span>
                    <span className="font-bold text-emerald-700">
                      {pointsLoading
                        ? "조회 중..."
                        : pointsBalance === null
                        ? "전화번호 입력 후 조회됩니다"
                        : `${pointsBalance.toLocaleString()}원`}
                    </span>
                  </div>
                  {pointsBalance !== null && pointsBalance > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={pointsToUse || ""}
                          min={0}
                          max={Math.min(pointsBalance, shop.depositAmount)}
                          step={100}
                          placeholder="0"
                          onChange={(e) => handlePointsToUseChange(Number(e.target.value))}
                          className="w-32 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
                        />
                        <span className="text-xs text-emerald-700">원 사용</span>
                        <button
                          type="button"
                          onClick={() => handlePointsToUseChange(Math.min(pointsBalance, shop.depositAmount))}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          전액 사용
                        </button>
                        {pointsToUse > 0 && (
                          <button
                            type="button"
                            onClick={() => { setPointsToUse(0); setPointsInputError(""); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            취소
                          </button>
                        )}
                      </div>
                      {pointsInputError && (
                        <p className="text-xs text-red-500">{pointsInputError}</p>
                      )}
                      {shop.pointsMinUse > 0 && (
                        <p className="text-xs text-emerald-600">
                          최소 사용 금액: {shop.pointsMinUse.toLocaleString()}원
                        </p>
                      )}
                    </div>
                  )}
                  {pointsBalance !== null && pointsBalance === 0 && (
                    <p className="text-xs text-emerald-600">사용 가능한 포인트가 없습니다.</p>
                  )}
                </div>
              )}

              {effectiveDeposit === 0 ? (
                <button
                  disabled={loading || !name.trim() || !phone.trim() || !isPointsValid()}
                  onClick={submitWithCard}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40"
                  style={{ background: "var(--rose-gold-500)" }}
                >
                  {loading ? "처리 중..." : "포인트로 예약 완료"}
                </button>
              ) : (
                <>
                  <p className="text-xs font-medium text-gray-600">결제 수단 선택</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={loading || !name.trim() || !phone.trim() || !isPointsValid()}
                      onClick={submitWithCard}
                      className="rounded-xl border-2 py-3 text-sm font-semibold transition disabled:opacity-40"
                      style={{ borderColor: "var(--rose-gold-400)", color: "var(--rose-gold-700)", background: "white" }}
                    >
                      💳 카드 결제
                    </button>
                    <button
                      disabled={loading || !name.trim() || !phone.trim() || !isPointsValid()}
                      onClick={submitWithDeposit}
                      className="rounded-xl border-2 py-3 text-sm font-semibold transition disabled:opacity-40"
                      style={{ borderColor: "var(--rose-gold-400)", color: "var(--rose-gold-700)", background: "white" }}
                    >
                      🏦 무통장입금
                    </button>
                  </div>
                </>
              )}
              {loading && (
                <p className="text-center text-xs text-gray-400">처리 중...</p>
              )}
            </div>
          ) : (
            <button
              disabled={loading || !name.trim() || !phone.trim()}
              onClick={submitDirect}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: "var(--rose-gold-500)" }}
            >
              {loading ? "예약 중..." : "예약 신청하기"}
            </button>
          )}

          <p className="text-center text-xs text-gray-400">
            예약 확정은 원장님 확인 후 별도 안내됩니다
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}
