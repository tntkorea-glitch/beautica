"use client";

import { useState } from "react";
import { updateBankAccount } from "./actions";
import type { BankCode } from "@/components/BankLinks";

const BANK_OPTIONS: { code: BankCode; name: string }[] = [
  { code: "kb",      name: "국민은행" },
  { code: "shinhan", name: "신한은행" },
  { code: "woori",   name: "우리은행" },
  { code: "hana",    name: "하나은행" },
  { code: "nh",      name: "NH농협" },
  { code: "ibk",     name: "IBK기업은행" },
  { code: "kakao",   name: "카카오뱅크" },
  { code: "toss",    name: "토스뱅크" },
  { code: "k",       name: "케이뱅크" },
  { code: "saemaul", name: "새마을금고" },
  { code: "busan",   name: "부산은행" },
  { code: "daegu",   name: "대구은행" },
];

export function BankAccountForm({
  initialCode,
  initialAccountNo,
  initialHolder,
}: {
  initialCode: string;
  initialAccountNo: string;
  initialHolder: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [accountNo, setAccountNo] = useState(initialAccountNo);
  const [holder, setHolder] = useState(initialHolder);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await updateBankAccount({ code, accountNo: accountNo.trim(), holder: holder.trim() });
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">은행 선택</label>
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          >
            <option value="">-- 은행 선택 --</option>
            {BANK_OPTIONS.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">예금주</label>
          <input
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            placeholder="홍길동"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">계좌번호</label>
        <input
          value={accountNo}
          onChange={(e) => setAccountNo(e.target.value)}
          placeholder="123-456-789012"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--rose-gold-500)" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.includes("오류") || msg.includes("입력") ? "text-red-500" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}
