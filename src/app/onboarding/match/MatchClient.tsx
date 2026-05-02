"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMatch, registerNew } from "./actions";
import { formatKST } from "@/lib/format";

type Candidate = {
  partner_id: string;
  customer_company_id: string | null;
  partner_name: string;
  representative_masked: string | null;
  business_no_masked: string | null;
  mobile_masked: string | null;
  address_short: string | null;
  registered_at: string | null;
  score: number;
  signals: string[] | null;
};

export function MatchClient({
  shopId,
  candidates,
}: {
  shopId: string;
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmMatch({
        shopId,
        partnerId: selected.partner_id,
        score: selected.score,
        signals: selected.signals ?? [],
      });
      if (result.error) setError(result.error);
      else router.replace(`/onboarding/match?shop=${shopId}`);
    });
  };

  const handleNew = () => {
    setError(null);
    startTransition(async () => {
      const result = await registerNew({ shopId });
      if (result.error) setError(result.error);
      else router.replace("/dashboard");
    });
  };

  return (
    <div className="space-y-3">
      {candidates.map((c) => {
        const isSelected = selected?.partner_id === c.partner_id;
        return (
          <button
            key={c.partner_id}
            type="button"
            onClick={() => setSelected(c)}
            className={`block w-full cursor-pointer rounded-lg border p-4 text-left transition ${
              isSelected
                ? "border-rose-gold-500 bg-rose-gold-50 ring-2 ring-rose-gold-300"
                : "border-gray-200 bg-white hover:border-rose-gold-400 hover:bg-rose-gold-50/30"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {isSelected ? "✓ " : ""}
                {c.partner_name}
              </span>
              <span className="text-xs text-gray-500">매칭 점수: {c.score}</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
              {c.representative_masked && (
                <>
                  <dt className="text-gray-400">대표자</dt>
                  <dd>{c.representative_masked}</dd>
                </>
              )}
              {c.business_no_masked && (
                <>
                  <dt className="text-gray-400">사업자번호</dt>
                  <dd className="font-mono">{c.business_no_masked}</dd>
                </>
              )}
              {c.mobile_masked && (
                <>
                  <dt className="text-gray-400">연락처</dt>
                  <dd className="font-mono">{c.mobile_masked}</dd>
                </>
              )}
              {c.address_short && (
                <>
                  <dt className="text-gray-400">주소</dt>
                  <dd>{c.address_short}</dd>
                </>
              )}
              {c.registered_at && (
                <>
                  <dt className="text-gray-400">등록일</dt>
                  <dd>{formatKST(c.registered_at, false)}</dd>
                </>
              )}
            </dl>
            {c.signals && c.signals.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                일치 신호: {c.signals.join(" · ")}
              </p>
            )}
          </button>
        );
      })}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {candidates.length > 0 && !selected && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          👆 위 거래처 카드를 먼저 클릭해서 선택한 다음 “이 거래처가 맞아요” 를 누르세요.
        </p>
      )}

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        {candidates.length > 0 && (
          <button
            type="button"
            disabled={!selected || isPending}
            onClick={handleConfirm}
            className="h-12 flex-1 rounded-lg bg-gray-900 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "처리 중..." : "이 거래처가 맞아요 (관리자 승인 요청)"}
          </button>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={handleNew}
          className="h-12 flex-1 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending
            ? "처리 중..."
            : candidates.length === 0
              ? "신규 거래처로 등록하기"
              : "신규 거래처로 등록"}
        </button>
      </div>
    </div>
  );
}
