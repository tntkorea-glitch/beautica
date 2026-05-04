"use client";

import { useState, useTransition } from "react";
import { updatePointsSettings } from "./actions";

export function PointsSettingsForm({
  initialEnabled,
  initialMinUse,
}: {
  initialEnabled: boolean;
  initialMinUse: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [minUse, setMinUse] = useState(initialMinUse);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePointsSettings({ enabled, minUse });
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">포인트 적립/사용 활성화</p>
          <p className="text-xs text-gray-500 mt-0.5">
            고객이 예약금 결제 시 1% 포인트 적립, 다음 예약 시 사용 가능합니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            enabled ? "bg-rose-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </label>

      {enabled && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            최소 포인트 사용 금액 (원)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minUse}
              min={100}
              max={100000}
              step={100}
              onChange={(e) => setMinUse(Number(e.target.value))}
              className="block w-36 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <span className="text-sm text-gray-500">원</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            1회 예약 시 최소 이 금액 이상의 포인트를 사용해야 합니다 (0원 사용은 항상 허용).
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
      </button>
    </div>
  );
}
