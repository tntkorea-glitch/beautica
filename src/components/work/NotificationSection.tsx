"use client";

import { useState } from "react";

type NotifKind = "CONFIRM" | "CANCEL" | "RETOUCH" | "FOLLOWUP";

const ACTIONS: { kind: NotifKind; emoji: string; label: string; preview: string }[] = [
  {
    kind: "CONFIRM",
    emoji: "✅",
    label: "예약 확정 안내",
    preview: "안녕하세요. 예약이 확정되었습니다. 일시: ...",
  },
  {
    kind: "CANCEL",
    emoji: "❌",
    label: "취소 안내",
    preview: "예약이 취소되었습니다. 사유: ...",
  },
  {
    kind: "RETOUCH",
    emoji: "💆",
    label: "리터치 안내",
    preview: "안녕하세요. 시술 후 한 달이 지났습니다. 리터치 예약 잡으실까요?",
  },
  {
    kind: "FOLLOWUP",
    emoji: "📅",
    label: "시술 N일 후 케어",
    preview: "시술 후 케어 안내드립니다. 첫 24시간은 ...",
  },
];

export function NotificationSection({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = useState<NotifKind | null>(null);

  const handleSend = (kind: NotifKind) => {
    setBusy(kind);
    setTimeout(() => {
      alert(
        "🚧 알림톡 실 발송은 Phase 3 (Solapi 연동) 에서 활성화됩니다.\n\n" +
          "지금은 UI 자리만 마련된 상태입니다.",
      );
      setBusy(null);
    }, 250);
    void bookingId;
  };

  return (
    <section className="rounded-lg border border-rose-gold-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">💌 알림톡</h3>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
          UI placeholder · 실 발송 Phase 3
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {ACTIONS.map((a) => (
          <button
            key={a.kind}
            type="button"
            disabled={busy === a.kind}
            onClick={() => handleSend(a.kind)}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-rose-gold-300 hover:bg-rose-gold-50 disabled:opacity-50"
          >
            <span className="text-2xl leading-none">{a.emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{a.label}</div>
              <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                {a.preview}
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Phase 3 에서 매장별 템플릿 편집 + Solapi 카카오 알림톡 / SMS 폴백 / Resend 이메일 / 웹푸시 모두 연결됩니다.
      </p>
    </section>
  );
}
