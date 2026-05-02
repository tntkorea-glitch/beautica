"use client";

import { useState } from "react";
import { TNT_BANK } from "@/lib/constants";

export function BankTransferBox({ total }: { total: number }) {
  const [copied, setCopied] = useState(false);

  const accountRaw = TNT_BANK.account.replace(/-/g, "");
  const tossAppLink = `supertoss://send?bank=${TNT_BANK.bankCode}&accountNumber=${accountRaw}&amount=${total}`;
  const tossPcLink = `https://toss.im/transfer-universal/transfer?bankCode=${TNT_BANK.bankCode}&accountNumber=${accountRaw}&amount=${total}`;

  function copyAccount() {
    navigator.clipboard.writeText(TNT_BANK.account).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h2 className="mb-3 text-base font-semibold text-amber-800">🏦 입금 계좌 안내</h2>
      <div className="space-y-1 text-sm text-amber-900">
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-amber-600">은행</span>
          <strong>{TNT_BANK.bank}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-amber-600">계좌번호</span>
          <strong className="font-mono text-base">{TNT_BANK.account}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-amber-600">예금주</span>
          <strong>{TNT_BANK.holder}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-amber-600">입금액</span>
          <strong className="font-mono text-rose-gold-700">{total.toLocaleString()}원</strong>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {/* 모바일: 토스 앱 딥링크 */}
        <a
          href={tossAppLink}
          className="flex items-center gap-1.5 rounded-lg bg-[#0064FF] px-3 py-2 text-xs font-medium text-white hover:opacity-90 md:hidden"
        >
          <TossIcon />
          토스로 이체
        </a>
        {/* PC: 토스 웹 */}
        <a
          href={tossPcLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg bg-[#0064FF] px-3 py-2 text-xs font-medium text-white hover:opacity-90 md:flex"
        >
          <TossIcon />
          토스로 이체
        </a>
        {/* 계좌번호 복사 */}
        <button
          type="button"
          onClick={copyAccount}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
        >
          {copied ? "✓ 복사됨" : "📋 계좌번호 복사"}
        </button>
      </div>
    </section>
  );
}

function TossIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 13H11V11h2v4zm0-6H11V7h2v2z" />
    </svg>
  );
}
