"use client";

import { useState } from "react";
import { updateNotificationSettings } from "./actions";

export function NotificationSettingsForm({
  initialEnabled,
  initialPhone,
}: {
  initialEnabled: boolean;
  initialPhone: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await updateNotificationSettings(enabled, phone);
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setEnabled(!enabled)}
          className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-400" : "bg-gray-200"}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </div>
        <span className="text-sm font-medium text-gray-700">카카오 알림톡 발송</span>
      </label>

      {enabled && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">발신 전화번호</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-60 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          />
          <p className="mt-1 text-xs text-gray-400">Solapi 에 등록된 발신번호와 동일해야 합니다.</p>
          <p className="mt-0.5 text-xs text-gray-400">
            예약 확정/취소 시 고객에게 알림톡이 자동 발송됩니다.
          </p>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-gray-400">
          알림톡을 켜면 예약 확정·취소 시 고객 휴대폰으로 카카오 메시지가 발송됩니다.
          <br />
          Solapi 계정 연동이 필요합니다 (환경변수 SOLAPI_API_KEY).
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--rose-gold-500)" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.includes("오류") || msg.includes("실패") ? "text-red-500" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
