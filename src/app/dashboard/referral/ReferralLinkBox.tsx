"use client";

import { useState } from "react";

export function ReferralLinkBox({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-4 py-3">
        <span className="flex-1 truncate font-mono text-sm text-gray-700">{url}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700"
        >
          {copied ? "복사됨 ✓" : "복사"}
        </button>
      </div>
      <div className="flex gap-2">
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`BEAUTICA 예약 프로그램 — 무료로 시작해보세요!\n${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          카카오/SNS 공유 →
        </a>
        <a
          href={`sms:?body=${encodeURIComponent(`BEAUTICA 예약 프로그램 초대 링크: ${url}`)}`}
          className="rounded-md border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          문자 공유 →
        </a>
      </div>
    </div>
  );
}
