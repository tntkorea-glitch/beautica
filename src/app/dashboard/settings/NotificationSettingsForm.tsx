"use client";

import { useState } from "react";
import { updateNotificationSettings, updateSolapiSettings, updateReminderSettings } from "./actions";
import { formatPhone } from "@/lib/format";

export function NotificationSettingsForm({
  initialEnabled,
  initialPhone,
  initialApiKey,
  initialApiSecret,
  initialPfId,
  initialTemplateConfirmed,
  initialTemplateCancelled,
  initialReminderEnabled,
  initialReminderHours,
  initialTemplateReminder,
}: {
  initialEnabled: boolean;
  initialPhone: string;
  initialApiKey: string;
  initialApiSecret: string;
  initialPfId: string;
  initialTemplateConfirmed: string;
  initialTemplateCancelled: string;
  initialReminderEnabled: boolean;
  initialReminderHours: number;
  initialTemplateReminder: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [apiKey, setApiKey] = useState(initialApiKey);
  const [apiSecret, setApiSecret] = useState(initialApiSecret);
  const [pfId, setPfId] = useState(initialPfId);
  const [templateConfirmed, setTemplateConfirmed] = useState(initialTemplateConfirmed || "BEAUTICA_CONFIRM");
  const [templateCancelled, setTemplateCancelled] = useState(initialTemplateCancelled || "BEAUTICA_CANCEL");
  const [showSecret, setShowSecret] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const [msgApi, setMsgApi] = useState("");

  const [reminderEnabled, setReminderEnabled] = useState(initialReminderEnabled);
  const [reminderHours, setReminderHours] = useState(initialReminderHours);
  const [templateReminder, setTemplateReminder] = useState(initialTemplateReminder || "BEAUTICA_REMINDER");
  const [savingReminder, setSavingReminder] = useState(false);
  const [msgReminder, setMsgReminder] = useState("");

  async function saveBasic() {
    setSaving(true);
    setMsg("");
    const res = await updateNotificationSettings(enabled, phone);
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  async function saveReminder() {
    setSavingReminder(true);
    setMsgReminder("");
    const res = await updateReminderSettings({
      enabled: reminderEnabled,
      hoursBefore: reminderHours,
      templateReminder,
    });
    setSavingReminder(false);
    setMsgReminder(res.error ?? "저장되었습니다.");
  }

  async function saveApi() {
    setSavingApi(true);
    setMsgApi("");
    const res = await updateSolapiSettings({
      apiKey,
      apiSecret,
      pfId,
      templateConfirmed,
      templateCancelled,
    });
    setSavingApi(false);
    setMsgApi(res.error ?? "저장되었습니다.");
  }

  return (
    <div className="space-y-6">
      {/* 발송 설정 */}
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3">
          <div
            onClick={() => setEnabled(!enabled)}
            className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-400" : "bg-gray-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">카카오 알림톡 발송</span>
        </label>

        {enabled ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">발신 전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="w-60 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
            />
            <p className="mt-1 text-xs text-gray-400">
              Solapi에 등록된 발신번호와 동일해야 합니다.
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            알림톡을 켜면 예약 확정·취소 시 고객 휴대폰으로 카카오 메시지가 발송됩니다.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={saveBasic}
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

      {/* D-1 예약 리마인더 */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">D-1 예약 리마인더</h3>
        <p className="mb-4 text-xs text-gray-400">
          매일 09:00 KST에 내일 예약된 고객에게 알림톡을 자동 발송합니다. (Solapi API 연동 필요)
        </p>

        <label className="mb-4 flex cursor-pointer items-center gap-3">
          <div
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`relative h-6 w-11 rounded-full transition ${reminderEnabled ? "bg-emerald-400" : "bg-gray-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${reminderEnabled ? "translate-x-5" : ""}`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">리마인더 발송</span>
        </label>

        {reminderEnabled && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                몇 시간 전 발송
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                />
                <span className="text-sm text-gray-500">시간 전</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">기본값 24 (D-1). 09:00 KST 기준으로 해당 일자 전체 예약에 발송합니다.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                리마인더 템플릿 코드
              </label>
              <input
                type="text"
                value={templateReminder}
                onChange={(e) => setTemplateReminder(e.target.value)}
                placeholder="BEAUTICA_REMINDER"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveReminder}
            disabled={savingReminder}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--rose-gold-500)" }}
          >
            {savingReminder ? "저장 중..." : "저장"}
          </button>
          {msgReminder && (
            <p className={`text-sm ${msgReminder.includes("오류") || msgReminder.includes("실패") ? "text-red-500" : "text-green-600"}`}>
              {msgReminder}
            </p>
          )}
        </div>
      </div>

      {/* Solapi API 연동 */}
      <div className="border-t border-gray-100 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Solapi API 연동</h3>
          <a
            href="https://console.solapi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            Solapi 콘솔 →
          </a>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Solapi 계정을 직접 만들어 API 키를 발급받고 카카오 채널을 연결하면,
          예약 알림톡이 내 발신번호로 발송됩니다.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="NCSXXXXXXXXXXXXXXXXXXXXX"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">API Secret</label>
            <div className="flex gap-2">
              <input
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="API Secret"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
              >
                {showSecret ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              채널 프로필 ID (pfId)
            </label>
            <input
              type="text"
              value={pfId}
              onChange={(e) => setPfId(e.target.value)}
              placeholder="PF_XXXXXXXXXXXXXXXX"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
            />
            <p className="mt-1 text-xs text-gray-400">
              Solapi 콘솔 → 카카오 채널에서 확인
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                예약 확정 템플릿 코드
              </label>
              <input
                type="text"
                value={templateConfirmed}
                onChange={(e) => setTemplateConfirmed(e.target.value)}
                placeholder="BEAUTICA_CONFIRM"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                예약 취소 템플릿 코드
              </label>
              <input
                type="text"
                value={templateCancelled}
                onChange={(e) => setTemplateCancelled(e.target.value)}
                placeholder="BEAUTICA_CANCEL"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-300"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveApi}
            disabled={savingApi}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {savingApi ? "저장 중..." : "API 연동 저장"}
          </button>
          {msgApi && (
            <p className={`text-sm ${msgApi.includes("오류") || msgApi.includes("실패") ? "text-red-500" : "text-green-600"}`}>
              {msgApi}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
