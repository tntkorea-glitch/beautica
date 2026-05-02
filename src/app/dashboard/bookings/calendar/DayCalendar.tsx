"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createPersonalEvent, deletePersonalEvent } from "./actions";

type CalBooking = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customerName: string;
  serviceName: string | null;
  staffColor: string;
  staffName: string | null;
};

type PersonalEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  note: string | null;
};

const HOUR_HEIGHT = 80;
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const PRESET_COLORS = [
  "#9ca3af", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#a78bfa", "#f472b6",
];

function toKSTDate(iso: string) {
  return new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:         "border-amber-400 bg-amber-50 text-amber-900",
  CONFIRMED:       "border-blue-400 bg-blue-50 text-blue-900",
  COMPLETED:       "border-green-400 bg-green-50 text-green-900",
  CANCELLED:       "border-gray-300 bg-gray-100 text-gray-500 opacity-50",
  NO_SHOW:         "border-red-400 bg-red-50 text-red-900 opacity-60",
  PAYMENT_PENDING: "border-purple-400 bg-purple-50 text-purple-900",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", CONFIRMED: "확정", COMPLETED: "완료",
  CANCELLED: "취소", NO_SHOW: "노쇼", PAYMENT_PENDING: "결제대기",
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function QuickAddModal({
  defaultDate,
  defaultHour,
  onClose,
  onSubmit,
  pending,
}: {
  defaultDate: string;
  defaultHour: number;
  onClose: () => void;
  onSubmit: (data: { title: string; startTime: string; endTime: string; color: string; note: string }) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(`${String(defaultHour).padStart(2, "0")}:00`);
  const [endTime, setEndTime] = useState(
    `${String(Math.min(defaultHour + 1, END_HOUR)).padStart(2, "0")}:00`,
  );
  const [color, setColor] = useState("#60a5fa");
  const [note, setNote] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold">개인 일정 추가</h3>
        <p className="mb-3 text-xs text-gray-500">{defaultDate}</p>

        <div className="space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="일정 제목 *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                onSubmit({ title, startTime, endTime, color, note });
              }
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">시작</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">종료</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-500">색상</label>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    color === c ? "scale-110 border-gray-700" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <textarea
            placeholder="메모 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => onSubmit({ title, startTime, endTime, color, note })}
            disabled={!title.trim() || pending}
            className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: color }}
          >
            {pending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DayCalendar({
  bookings,
  dateParam,
  personalEvents,
}: {
  bookings: CalBooking[];
  dateParam: string;
  personalEvents: PersonalEvent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quickAdd, setQuickAdd] = useState<{ hour: number } | null>(null);

  const date = new Date(dateParam + "T00:00:00");

  function navigate(offset: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + offset);
    router.push(`/dashboard/bookings/calendar?view=day&date=${formatDateParam(next)}`);
  }

  function goToday() {
    const now = new Date();
    router.push(`/dashboard/bookings/calendar?view=day&date=${formatDateParam(now)}`);
  }

  function handleCreate(data: {
    title: string;
    startTime: string;
    endTime: string;
    color: string;
    note: string;
  }) {
    if (!quickAdd) return;
    startTransition(async () => {
      await createPersonalEvent({
        title: data.title,
        start_at: `${dateParam}T${data.startTime}:00+09:00`,
        end_at: `${dateParam}T${data.endTime}:00+09:00`,
        color: data.color,
        note: data.note || undefined,
      });
      setQuickAdd(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    startTransition(async () => {
      await deletePersonalEvent(id);
    });
  }

  const dayBookings = bookings.filter((b) => {
    const d = toKSTDate(b.start_at);
    return formatDateParam(d) === dateParam;
  });

  const dayEvents = personalEvents.filter((ev) => {
    const d = toKSTDate(ev.start_at);
    return formatDateParam(d) === dateParam;
  });

  const isToday = dateParam === formatDateParam(new Date());

  return (
    <div>
      {quickAdd && (
        <QuickAddModal
          defaultDate={dateParam}
          defaultHour={quickAdd.hour}
          onClose={() => setQuickAdd(null)}
          onSubmit={handleCreate}
          pending={isPending}
        />
      )}

      {/* Day nav */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          ← 전날
        </button>
        <span className={`text-sm font-semibold ${isToday ? "text-rose-600" : "text-gray-700"}`}>
          {date.getMonth() + 1}월 {date.getDate()}일 ({WEEKDAY[date.getDay()]}){isToday ? " • 오늘" : ""}
        </span>
        <button onClick={() => navigate(1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          다음 날 →
        </button>
        <button onClick={goToday} className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
          오늘
        </button>
        <span className="ml-auto text-xs text-gray-400">빈 칸 클릭 → 일정 추가</span>
      </div>

      {/* Summary bar */}
      <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
        <span>예약 <strong>{dayBookings.length}</strong>건</span>
        {["PENDING","CONFIRMED","COMPLETED"].map((s) => {
          const cnt = dayBookings.filter((b) => b.status === s).length;
          return cnt > 0 ? (
            <span key={s} className="text-xs">
              {STATUS_LABEL[s]} {cnt}
            </span>
          ) : null;
        })}
        {dayEvents.length > 0 && (
          <span className="text-xs text-blue-500">개인일정 {dayEvents.length}건</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex min-w-[400px]">
          {/* Time axis */}
          <div className="w-14 flex-shrink-0 border-r border-gray-100">
            <div className="h-10 border-b border-gray-100" />
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div key={i} className="flex items-start justify-end border-b border-gray-50 pr-2 pt-1 text-xs text-gray-400" style={{ height: HOUR_HEIGHT }}>
                {START_HOUR + i}:00
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="relative flex-1">
            <div className={`flex h-10 items-center px-3 border-b border-gray-100 text-sm font-medium ${isToday ? "bg-rose-50 text-rose-600" : "text-gray-600"}`}>
              {date.getMonth() + 1}/{date.getDate()} ({WEEKDAY[date.getDay()]})
            </div>

            {/* Hour rows (clickable) */}
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/20"
                style={{ height: HOUR_HEIGHT }}
                onClick={() => setQuickAdd({ hour: START_HOUR + i })}
              />
            ))}

            {/* Personal events */}
            {dayEvents.map((ev) => {
              const startKST = toKSTDate(ev.start_at);
              const endKST = toKSTDate(ev.end_at);
              const startMin = startKST.getHours() * 60 + startKST.getMinutes();
              const endMin = endKST.getHours() * 60 + endKST.getMinutes();
              const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 40;
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 28);
              const timeStr = `${String(startKST.getHours()).padStart(2,"0")}:${String(startKST.getMinutes()).padStart(2,"0")} ~ ${String(endKST.getHours()).padStart(2,"0")}:${String(endKST.getMinutes()).padStart(2,"0")}`;

              return (
                <div
                  key={ev.id}
                  className="absolute left-2 right-2 overflow-hidden rounded-lg border-l-4 px-3 py-1.5"
                  style={{
                    top,
                    height,
                    borderLeftColor: ev.color,
                    backgroundColor: ev.color + "28",
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-semibold" style={{ color: ev.color }}>{ev.title}</span>
                    <span className="text-xs opacity-70" style={{ color: ev.color }}>개인</span>
                  </div>
                  <div className="text-xs opacity-60" style={{ color: ev.color }}>{timeStr}</div>
                  {ev.note && <div className="mt-0.5 truncate text-xs opacity-50" style={{ color: ev.color }}>{ev.note}</div>}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ev.id); }}
                    className="absolute right-2 top-1.5 text-base leading-none text-gray-400 hover:text-red-500"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Bookings */}
            {dayBookings.map((b) => {
              const startKST = toKSTDate(b.start_at);
              const endKST = toKSTDate(b.end_at);
              const startMin = startKST.getHours() * 60 + startKST.getMinutes();
              const endMin = endKST.getHours() * 60 + endKST.getMinutes();
              const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 40;
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 32);
              const timeStr = `${String(startKST.getHours()).padStart(2,"0")}:${String(startKST.getMinutes()).padStart(2,"0")} ~ ${String(endKST.getHours()).padStart(2,"0")}:${String(endKST.getMinutes()).padStart(2,"0")}`;

              return (
                <Link
                  key={b.id}
                  href={`/dashboard/bookings/${b.id}`}
                  className={`absolute left-2 right-2 overflow-hidden rounded-lg border-l-4 px-3 py-1.5 hover:opacity-80 ${STATUS_COLOR[b.status] ?? "border-gray-400 bg-gray-50"}`}
                  style={{ top, height }}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: b.staffColor }} />
                    <span className="font-semibold">{b.customerName}</span>
                    <span className="text-xs opacity-70">{STATUS_LABEL[b.status]}</span>
                  </div>
                  {b.serviceName && <div className="mt-0.5 truncate text-xs opacity-80">{b.serviceName}</div>}
                  <div className="text-xs opacity-60">{timeStr}{b.staffName ? ` · ${b.staffName}` : ""}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
