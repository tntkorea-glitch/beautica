"use client";

import { useState } from "react";
import { updateDepositSettings } from "./actions";

type DepositType = "FIXED" | "PERCENT";

const WAIT_OPTIONS = [
  { value: 10, label: "10분" },
  { value: 20, label: "20분" },
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 120, label: "2시간" },
  { value: 1440, label: "24시간" },
];

const CANCEL_OPTIONS = [
  { value: 60, label: "1시간 이내" },
  { value: 360, label: "6시간 이내" },
  { value: 720, label: "12시간 이내" },
  { value: 1440, label: "24시간 이내" },
  { value: 4320, label: "3일 이내" },
];

export function DepositSettingsForm({
  initialRequired,
  initialAmount,
  initialType,
  initialPercent,
  initialWaitMin,
  initialCancelMin,
  initialMemberExcept,
}: {
  initialRequired: boolean;
  initialAmount: number;
  initialType: DepositType;
  initialPercent: number;
  initialWaitMin: number;
  initialCancelMin: number;
  initialMemberExcept: boolean;
}) {
  const [required, setRequired] = useState(initialRequired);
  const [type, setType] = useState<DepositType>(initialType ?? "FIXED");
  const [amount, setAmount] = useState(String(initialAmount));
  const [percent, setPercent] = useState(String(initialPercent || 10));
  const [waitMin, setWaitMin] = useState(initialWaitMin ?? 30);
  const [cancelMin, setCancelMin] = useState(initialCancelMin ?? 1440);
  const [memberExcept, setMemberExcept] = useState(initialMemberExcept ?? false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await updateDepositSettings({
      required,
      amount: Number(amount) || 0,
      type,
      percent: Number(percent) || 10,
      waitMin,
      cancelMin,
      memberExcept,
    });
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  const Toggle = ({
    value,
    onChange,
    label,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${value ? "bg-rose-400" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`}
        />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="space-y-5">
      <Toggle value={required} onChange={setRequired} label="예약금 필수 받기" />

      {required && (
        <>
          {/* 예약금 유형 */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">예약금 유형</p>
            <div className="flex gap-3">
              {(["FIXED", "PERCENT"] as DepositType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    type === t
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t === "FIXED" ? "정액" : "정률 (%)"}
                </button>
              ))}
            </div>
          </div>

          {/* 금액 / 비율 */}
          {type === "FIXED" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">예약금 금액</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1000}
                  max={500000}
                  step={1000}
                  className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                <span className="text-sm text-gray-500">원</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">예약금 비율</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  min={1}
                  max={100}
                  step={5}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                <span className="text-sm text-gray-500">% (시술 가격 기준)</span>
              </div>
            </div>
          )}

          {/* 결제 대기 시간 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">결제 대기 시간</label>
            <p className="mb-2 text-xs text-gray-400">예약 신청 후 이 시간 내에 결제하지 않으면 자동 취소됩니다.</p>
            <div className="flex flex-wrap gap-2">
              {WAIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setWaitMin(opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    waitMin === opt.value
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 취소 확정 기준 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">취소 환불 기준</label>
            <p className="mb-2 text-xs text-gray-400">방문 전 이 시간 이내에 취소 시 예약금을 환불하지 않습니다.</p>
            <div className="flex flex-wrap gap-2">
              {CANCEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCancelMin(opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                    cancelMin === opt.value
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 회원권 예외 */}
          <Toggle
            value={memberExcept}
            onChange={setMemberExcept}
            label="회원권(회수권/선불권) 보유 고객 예약금 면제"
          />
        </>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--rose-gold-500)" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {msg && (
          <p
            className={`text-sm ${
              msg.includes("오류") || msg.includes("입력") || msg.includes("비율")
                ? "text-red-500"
                : "text-green-600"
            }`}
          >
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
