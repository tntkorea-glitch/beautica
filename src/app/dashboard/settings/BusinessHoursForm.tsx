"use client";

import { useState } from "react";
import { updateBusinessHours } from "./actions";

const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];
type DayHours = { open: string; close: string; closed: boolean };
type Hours = Record<DayKey, DayHours>;

const DEFAULT_HOURS: Hours = {
  mon: { open: "10:00", close: "20:00", closed: false },
  tue: { open: "10:00", close: "20:00", closed: false },
  wed: { open: "10:00", close: "20:00", closed: false },
  thu: { open: "10:00", close: "20:00", closed: false },
  fri: { open: "10:00", close: "20:00", closed: false },
  sat: { open: "10:00", close: "18:00", closed: false },
  sun: { open: "10:00", close: "18:00", closed: true },
};

function parseInitial(raw: unknown): Hours {
  if (!raw || typeof raw !== "object") return DEFAULT_HOURS;
  const merged = { ...DEFAULT_HOURS };
  for (const day of DAYS) {
    const entry = (raw as Record<string, unknown>)[day.key];
    if (entry && typeof entry === "object") {
      merged[day.key] = {
        open: String((entry as Record<string, unknown>).open ?? "10:00"),
        close: String((entry as Record<string, unknown>).close ?? "20:00"),
        closed: Boolean((entry as Record<string, unknown>).closed),
      };
    }
  }
  return merged;
}

export function BusinessHoursForm({ initialHours }: { initialHours: unknown }) {
  const [hours, setHours] = useState<Hours>(parseInitial(initialHours));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function update(day: DayKey, field: keyof DayHours, value: string | boolean) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await updateBusinessHours(hours);
    setSaving(false);
    setMsg(res.error ?? "저장되었습니다.");
  }

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const day = hours[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-6 text-center text-sm font-semibold text-gray-700">{label}</span>

            {/* 휴무 토글 */}
            <button
              type="button"
              onClick={() => update(key, "closed", !day.closed)}
              className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${day.closed ? "bg-gray-300" : "bg-emerald-400"}`}
            >
              <span className={`ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${day.closed ? "" : "translate-x-5"}`} />
            </button>
            <span className="w-10 text-xs text-gray-500">{day.closed ? "휴무" : "영업"}</span>

            {!day.closed && (
              <>
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => update(key, "open", e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-rose-300"
                />
                <span className="text-xs text-gray-400">~</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => update(key, "close", e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-rose-300"
                />
              </>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
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
