"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNaverBooking } from "./actions";

export function NaverBookingSettings({
  initialEnabled,
  initialBusinessId,
  initialPlaceUrl,
}: {
  initialEnabled: boolean;
  initialBusinessId: string;
  initialPlaceUrl: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [businessId, setBusinessId] = useState(initialBusinessId);
  const [placeUrl, setPlaceUrl] = useState(initialPlaceUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const handleSave = () => {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const r = await updateNaverBooking(enabled, businessId, placeUrl);
      if (r.error) {
        setError(r.error);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-gray-50 p-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition " +
            (enabled ? "bg-green-600" : "bg-gray-300")
          }
        >
          <span
            className={
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition " +
              (enabled ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            {enabled ? "✅ 네이버 예약 연동 사용" : "⛔ 사용 안 함"}
          </div>
          <div className="text-xs text-gray-500">
            클릭하여 토글 → 아래 "저장" 버튼으로 적용
          </div>
        </div>
      </label>

      {/* 활성화 시 추가 입력 */}
      {enabled && (
        <div className="space-y-4 rounded-md border border-blue-200 bg-blue-50 p-4">

          {/* 네이버 지도 매장 링크 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              네이버 지도 내 매장 링크
            </label>
            <input
              type="url"
              value={placeUrl}
              onChange={(e) => setPlaceUrl(e.target.value)}
              placeholder="https://map.naver.com/p/entry/place/1234567890"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <div className="mt-2 rounded-md bg-white/70 p-3 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">📍 링크 찾는 방법</p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-600">
                <li>
                  <a href="https://map.naver.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">네이버 지도</a>
                  {" "}에서 내 매장 이름 검색
                </li>
                <li>검색 결과에서 내 매장 클릭</li>
                <li>브라우저 주소창의 URL 전체 복사 후 붙여넣기</li>
              </ol>
              <p className="mt-1 text-gray-400">예시: https://map.naver.com/p/entry/place/<span className="font-mono">1234567890</span></p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              입력하면 고객 예약 페이지에 "네이버에서도 예약 가능" 버튼이 표시됩니다.
            </p>
          </div>

          {/* 스마트플레이스 비즈니스 ID */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              스마트플레이스 비즈니스 ID{" "}
              <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <input
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="예: 1234567"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <div className="mt-2 rounded-md bg-white/70 p-3 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">🔑 ID 찾는 방법</p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-600">
                <li>
                  <a href="https://smartplace.naver.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">네이버 스마트플레이스</a>
                  {" "}에 로그인
                </li>
                <li>우측 상단 프로필 아이콘 클릭</li>
                <li>"비즈니스 계정 관리" → ID 숫자 확인</li>
              </ol>
              <p className="mt-1 text-gray-400">예시: <span className="font-mono">1234567</span> (숫자만)</p>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              실제 예약 데이터 연동(sync) 활성화 시 필요합니다. 지금은 입력하지 않아도 됩니다.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        {savedAt && (
          <span className="text-xs text-green-700">
            ✅ 저장 완료 ({savedAt.toLocaleTimeString("ko-KR")})
          </span>
        )}
      </div>
    </div>
  );
}
