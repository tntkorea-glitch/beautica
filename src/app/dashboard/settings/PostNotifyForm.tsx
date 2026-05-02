"use client";

import { useState } from "react";
import { updatePostNotifySettings } from "./actions";

const DELAY_OPTIONS = [
  { value: 2, label: "2시간 후" },
  { value: 6, label: "6시간 후" },
  { value: 12, label: "12시간 후" },
  { value: 24, label: "24시간 후" },
  { value: 48, label: "48시간 후" },
];

export function PostNotifyForm({
  initialEnabled,
  initialDelayH,
}: {
  initialEnabled: boolean;
  initialDelayH: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [delayH, setDelayH] = useState(initialDelayH ?? 24);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await updatePostNotifySettings(enabled, delayH);
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-3">
        <div
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-rose-400" : "bg-gray-200"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">시술 후 자동 알림톡 발송</span>
      </label>

      {enabled && (
        <div>
          <p className="mb-2 text-xs text-gray-500">
            시술 완료 처리 후 이 시간이 지나면 고객에게 자동으로 알림톡을 보냅니다. (예: 시술 후기 요청, 감사 인사)
          </p>
          <div className="flex flex-wrap gap-2">
            {DELAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDelayH(opt.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  delayH === opt.value
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-600">
            ⚠️ 실제 발송은 알림톡(카카오) 설정이 활성화된 경우에만 작동합니다.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
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
          <p className={`text-sm ${msg.includes("오류") ? "text-red-500" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
