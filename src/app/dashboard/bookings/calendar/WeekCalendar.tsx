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

const HOUR_HEIGHT = 64;
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

function getWeekDays(baseDate: Date) {
  const monday = new Date(baseDate);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "border-amber-400 bg-amber-50",
  CONFIRMED: "border-blue-400 bg-blue-50",
  COMPLETED: "border-green-400 bg-green-50",
  CANCELLED: "border-gray-300 bg-gray-100 opacity-50",
  NO_SHOW: "border-red-400 bg-red-50 opacity-60",
  PAYMENT_PENDING: "border-purple-400 bg-purple-50",
};

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

export function WeekCalendar({
  bookings,
  weekStart,
  personalEvents,
}: {
  bookings: CalBooking[];
  weekStart: string;
  personalEvents: PersonalEvent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quickAdd, setQuickAdd] = useState<{ date: string; hour: number } | null>(null);

  const base = new Date(weekStart + "T00:00:00");
  const days = getWeekDays(base);

  function navigate(offset: number) {
    const next = new Date(base);
    next.setDate(next.getDate() + offset * 7);
    router.push(`/dashboard/bookings/calendar?week=${formatDateParam(next)}`);
  }

  function handleSlotClick(day: Date, hour: number) {
    setQuickAdd({ date: formatDateParam(day), hour });
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
        start_at: `${quickAdd.date}T${data.startTime}:00+09:00`,
        end_at: `${quickAdd.date}T${data.endTime}:00+09:00`,
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

  const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
  const today = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

  return (
    <div>
      {quickAdd && (
        <QuickAddModal
          defaultDate={quickAdd.date}
          defaultHour={quickAdd.hour}
          onClose={() => setQuickAdd(null)}
          onSubmit={handleCreate}
          pending={isPending}
        />
      )}

      {/* Week nav */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← 이전 주
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {days[0].getMonth() + 1}월 {days[0].getDate()}일 ~ {days[6].getMonth() + 1}월{" "}
          {days[6].getDate()}일
        </span>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          다음 주 →
        </button>
        <button
          onClick={() => {
            const now = new Date();
            const mon = getWeekDays(now)[0];
            router.push(`/dashboard/bookings/calendar?week=${formatDateParam(mon)}`);
          }}
          className="ml-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          오늘
        </button>
        <span className="ml-auto text-xs text-gray-400">빈 칸 클릭 → 일정 추가</span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex min-w-[640px]">
          {/* Time axis */}
          <div className="w-12 flex-shrink-0 border-r border-gray-100">
            <div className="h-10 border-b border-gray-100" />
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="border-b border-gray-100 pr-1 text-right text-xs text-gray-400"
                style={{ height: HOUR_HEIGHT }}
              >
                {START_HOUR + i}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayStr = formatDateParam(day);
            const isToday =
              day.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) === today;

            const dayBookings = bookings.filter((b) => {
              const d = toKSTDate(b.start_at);
              return formatDateParam(d) === dayStr;
            });

            const dayEvents = personalEvents.filter((ev) => {
              const d = toKSTDate(ev.start_at);
              return formatDateParam(d) === dayStr;
            });

            return (
              <div
                key={di}
                className="relative flex-1 border-r border-gray-100 last:border-r-0"
              >
                {/* Day header */}
                <div
                  className={`flex h-10 items-center justify-center border-b border-gray-100 text-xs font-semibold ${
                    isToday ? "bg-rose-50 text-rose-600" : "text-gray-600"
                  }`}
                >
                  {DAY_LABELS[di]} {day.getMonth() + 1}/{day.getDate()}
                </div>

                {/* Hour rows (clickable for quick-add) */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/20"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(day, START_HOUR + i)}
                  />
                ))}

                {/* Personal events */}
                {dayEvents.map((ev) => {
                  const startKST = toKSTDate(ev.start_at);
                  const endKST = toKSTDate(ev.end_at);
                  const startMin = startKST.getHours() * 60 + startKST.getMinutes();
                  const endMin = endKST.getHours() * 60 + endKST.getMinutes();
                  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 40;
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18);

                  return (
                    <div
                      key={ev.id}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded border-l-2 px-1 py-0.5 text-xs"
                      style={{
                        top,
                        height,
                        borderLeftColor: ev.color,
                        backgroundColor: ev.color + "28",
                      }}
                    >
                      <span
                        className="block truncate font-medium leading-tight"
                        style={{ color: ev.color }}
                      >
                        {ev.title}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ev.id);
                        }}
                        className="absolute right-0.5 top-0 text-sm leading-none text-gray-400 hover:text-red-500"
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
                  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);

                  return (
                    <Link
                      key={b.id}
                      href={`/dashboard/bookings/${b.id}`}
                      className={`absolute left-0.5 right-0.5 overflow-hidden rounded border-l-2 px-1 py-0.5 text-xs hover:opacity-80 ${STATUS_COLOR[b.status] ?? "border-gray-400 bg-gray-50"}`}
                      style={{ top, height }}
                    >
                      <div
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: b.staffColor }}
                      />
                      <span className="font-medium">{b.customerName}</span>
                      {b.serviceName && (
                        <div className="truncate text-gray-500">{b.serviceName}</div>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
