"use client";

import { useState, useTransition } from "react";
import { searchPartners, manualMatch, type PartnerSearchResult } from "./actions";

import { tierLabel } from "@/lib/tier";

export function ManualMatchPanel({
  shopId,
  ownerUserId,
  currentTier,
}: {
  shopId: string;
  ownerUserId: string | null;
  currentTier: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartnerSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [matchPending, setMatchPending] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  // 신규 가입(tier=1) 매장의 수동 매칭은 거의 항상 뷰티샵(tier=2)이 디폴트.
  // 이미 tier=2/3 인 매장만 그 등급 유지.
  const [tier, setTier] = useState<1 | 2 | 3>(
    currentTier >= 2 && currentTier <= 3 ? (currentTier as 2 | 3) : 2,
  );

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setMatchError(null);
    startTransition(async () => {
      const res = await searchPartners(query, ownerUserId);
      if (res.error) {
        setSearchError(res.error);
        setResults([]);
      } else {
        setResults(res.results);
      }
      setSearched(true);
    });
  };

  const runMatch = async (partnerId: string, partnerName: string) => {
    const ok = window.confirm(
      `'${partnerName}' 거래처와 매칭하시겠습니까?\n\n등급: ${tier} (${tierLabel(tier)})\n기존 매핑은 자동 정리되고 tier 가 갱신됩니다.`,
    );
    if (!ok) return;
    setMatchPending(partnerId);
    setMatchError(null);
    const res = await manualMatch({ shopId, partnerId, targetTier: tier });
    setMatchPending(null);
    if (res.error) {
      setMatchError(res.error);
    } else {
      window.location.reload();
    }
  };

  return (
    <div>
      <form onSubmit={runSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="상호 / 대표자명 / 사업자번호 / 휴대폰 (부분 검색)"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "검색 중…" : "검색"}
        </button>
      </form>

      <div className="mb-3 flex items-center gap-3 text-xs text-gray-700">
        <span className="text-gray-600">매칭 시 적용할 등급:</span>
        {([1, 2, 3] as const).map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-1">
            <input
              type="radio"
              name="tier"
              checked={tier === t}
              onChange={() => setTier(t)}
              className="h-3 w-3"
            />
            <span>{tierLabel(t)}</span>
          </label>
        ))}
      </div>

      {searchError && (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          검색 실패: {searchError}
        </div>
      )}
      {matchError && (
        <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          매칭 실패: {matchError}
        </div>
      )}

      {searched && results.length === 0 && !searchError && (
        <div className="rounded border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
          검색 결과가 없습니다. 다른 키워드로 시도해보세요. (예: 대표자명만, 휴대폰 일부, 사업자번호 일부)
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => {
            const busy = matchPending === r.partnerId;
            const blocked = r.alreadyMappedToOther;
            return (
              <li key={r.partnerId} className="rounded border bg-gray-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">{r.partnerName}</span>
                      {r.ccTier && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                          현재 등급: {tierLabel(r.ccTier)}
                        </span>
                      )}
                      {blocked && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          ⚠️ 다른 회원에 매핑됨
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {[
                        r.representative && `대표 ${r.representative}`,
                        r.businessNo,
                        r.mobile ?? r.phone,
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </div>
                    {r.address && (
                      <div className="mt-0.5 text-xs text-gray-500">{r.address}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy || blocked}
                    onClick={() => runMatch(r.partnerId, r.partnerName)}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "매칭 중…" : "이 거래처로 매칭"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
